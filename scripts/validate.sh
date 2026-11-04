#!/usr/bin/env bash
# Render every Helm chart in the repo and validate the output against the
# Kubernetes version the lab runs (strict: unknown fields fail) and against
# the CRD schemas of every platform component.
#
#   ./scripts/validate.sh            # all charts
#
# Needs: helm, kubeconform, python3 with PyYAML. Rendered output goes to
# .render/ (gitignored).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/.render"
K8S_VERSION="${K8S_VERSION:-1.37.2}"
LBC_CHART_VERSION="3.6.2"
mkdir -p "$OUT/schemas" "$OUT/manifests"

# First python that has PyYAML (Windows often has a python3 stub without it).
PY=""
for candidate in ${PYTHON:-} python3 python; do
  if command -v "$candidate" >/dev/null && "$candidate" -c 'import yaml' 2>/dev/null; then PY="$candidate"; break; fi
done
[ -n "$PY" ] || { echo "python with PyYAML is required (pip install pyyaml)" >&2; exit 1; }

# --- CRD schemas -------------------------------------------------------------
# Gateway API (vendored) and the AWS LB controller CRDs are converted locally
# so validation matches exactly the versions this lab installs. Everything
# else (Argo CD, ESO, Prometheus Operator) comes from the CRDs catalog.
if [ ! -f "$OUT/schemas/.done-$LBC_CHART_VERSION" ]; then
  echo "== generating CRD schemas"
  curl -sfL -o "$OUT/openapi2jsonschema.py" \
    https://raw.githubusercontent.com/yannh/kubeconform/v0.8.0/scripts/openapi2jsonschema.py
  rm -rf "$OUT/lbc" && helm pull aws-load-balancer-controller --repo https://aws.github.io/eks-charts \
    --version "$LBC_CHART_VERSION" --untar --untardir "$OUT/lbc" >/dev/null
  # Writes <kind>_<version>.json (lower-case kind); kinds don't collide here.
  (
    cd "$OUT/schemas"
    "$PY" "$OUT/openapi2jsonschema.py" \
      "$ROOT/terraform/charts/gateway-api-crds/templates/standard-install.yaml" \
      "$OUT/lbc/aws-load-balancer-controller/crds/gateway-crds.yaml" >/dev/null
  )
  touch "$OUT/schemas/.done-$LBC_CHART_VERSION"
fi

kc() {
  kubeconform -strict -summary -kubernetes-version "$K8S_VERSION" \
    -schema-location default \
    -schema-location "$OUT/schemas/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json" \
    -skip CustomResourceDefinition \
    -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
    "$@"
}

render() { # render <name> <chart-dir> [helm args...]
  local name="$1" chart="$2"; shift 2
  echo "== helm template $name"
  # Same as Argo CD's repo-server: build file:// dependencies (lab-app library).
  if grep -q '^dependencies:' "$chart/Chart.yaml"; then
    helm dependency build "$chart" >/dev/null
  fi
  helm lint --quiet "$chart" "$@" >/dev/null
  helm template "$name" "$chart" "$@" > "$OUT/manifests/$name.yaml"
}

# --- Platform charts (installed by Terraform) ---------------------------------
TF_CHARTS="$ROOT/terraform/charts"
render platform-config "$TF_CHARTS/platform-config" --namespace gateway \
  --set region=us-east-1 --set domain=lab.example.com \
  --set certificateArn=arn:aws:acm:us-east-1:111122223333:certificate/00000000-0000-0000-0000-000000000000 \
  --set efsFileSystemId=fs-0123456789abcdef0 --set secretPrefix=k8slab
render platform-routes "$TF_CHARTS/platform-routes" --namespace gateway \
  --set argocd.host=argocd.lab.example.com --set grafana.host=grafana.lab.example.com
render argocd-bootstrap "$TF_CHARTS/argocd-bootstrap" --namespace argocd \
  --set repoURL=https://github.com/example/k8s-platform-lab.git \
  --set 'appNamespaces={shopline,northbank}' --set global.domain=lab.example.com

# The vendored Gateway API CRDs themselves (CRD + ValidatingAdmissionPolicy).
echo "== gateway-api-crds"
cp "$TF_CHARTS/gateway-api-crds/templates/standard-install.yaml" "$OUT/manifests/gateway-api-crds.yaml"

# --- GitOps charts (deployed by Argo CD) ---------------------------------------
GLOBAL_VALUES="$ROOT/scripts/test-values/global.yaml"
render root "$ROOT/gitops/root" --namespace argocd -f "$GLOBAL_VALUES"

if [ -d "$ROOT/gitops/apps" ]; then
  for chart in "$ROOT"/gitops/apps/*/; do
    [ -f "$chart/Chart.yaml" ] || continue
    name="$(basename "$chart")"
    render "app-$name" "$chart" --namespace "$name" -f "$GLOBAL_VALUES"
  done
fi
if [ -d "$ROOT/gitops/platform" ]; then
  for chart in "$ROOT"/gitops/platform/*/; do
    [ -f "$chart/Chart.yaml" ] || continue
    name="$(basename "$chart")"
    render "platform-$name" "$chart" --namespace "$name" -f "$GLOBAL_VALUES"
  done
fi

echo "== kubeconform (Kubernetes $K8S_VERSION, strict)"
kc "$OUT"/manifests/*.yaml
