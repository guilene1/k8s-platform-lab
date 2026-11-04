# Kubernetes Platform Lab

A production-style Amazon EKS platform built with one `terraform apply`: Gateway API on an AWS Application Load Balancer, Argo CD GitOps, EFS shared storage, External Secrets, external-dns, autoscaling, and Prometheus/Grafana. Ten real applications run on top of it.

> **Status:** under construction. The platform and the first app (ShopLine) are in place; the other apps and full docs follow.

## Layout

| Path | What it is |
|---|---|
| `terraform/` | AWS infrastructure + every platform component (root module) |
| `terraform/charts/` | Small local Helm charts Terraform installs (Gateway, StorageClass, Argo CD bootstrap…) |
| `apps/<app>/{api,web}` | Application source (Node.js API, React frontend) and Dockerfiles |
| `apps/shared/` | Runtime shared by every app: API kit (health, metrics, migrations) and nginx config |
| `gitops/root/` | The Argo CD app-of-apps chart |
| `gitops/charts/lab-app/` | Library chart every app is built from |
| `gitops/apps/<app>/` | One small Helm chart per app |
| `gitops/platform/db-bootstrap/` | Job that creates the app databases and users on RDS |
| `scripts/validate.sh` | Renders every chart and validates it against Kubernetes 1.37 (strict) |
