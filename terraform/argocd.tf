###############################################################################
# Argo CD + platform UI routes + the root (app-of-apps) Application.
###############################################################################

resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = "10.11.7" # Argo CD v3.5.7
  namespace        = "argocd"
  create_namespace = true

  values = [yamlencode({
    global = {
      domain = local.platform_hosts.argocd
    }
    configs = {
      params = {
        # TLS terminates at the ALB; argocd-server speaks plain HTTP behind it.
        "server.insecure" = true
      }
      cm = {
        # Annotation-based tracking: Argo CD only treats objects it created
        # (carrying its tracking annotation) as part of an Application.
        "application.resourceTrackingMethod" = "annotation"
      }
    }
    dex           = { enabled = false }
    notifications = { enabled = false }

    controller = {
      metrics = { enabled = true, serviceMonitor = { enabled = true } }
    }
    server = {
      metrics = { enabled = true, serviceMonitor = { enabled = true } }
    }
    repoServer = {
      metrics = { enabled = true, serviceMonitor = { enabled = true } }
    }
    applicationSet = {
      metrics = { enabled = true, serviceMonitor = { enabled = true } }
    }
  })]

  wait    = true
  timeout = 900

  depends_on = [
    helm_release.kube_prometheus_stack, # ServiceMonitor CRD
    helm_release.platform_config,
  ]
}

# HTTPRoutes for the Argo CD and Grafana UIs (+ health-check overrides).
resource "helm_release" "platform_routes" {
  name      = "platform-routes"
  chart     = "${path.module}/charts/platform-routes"
  namespace = "gateway"

  values = [yamlencode({
    gateway = { name = "lab-gateway", namespace = "gateway" }
    argocd  = { host = local.platform_hosts.argocd }
    grafana = { host = local.platform_hosts.grafana }
  })]

  depends_on = [
    helm_release.argocd,
    helm_release.kube_prometheus_stack,
    helm_release.external_dns,
  ]
}

# AppProjects + the root Application. Terraform's last step: from here on,
# Argo CD deploys the 10 apps from git (var.gitops_repo_url).
resource "helm_release" "argocd_bootstrap" {
  name      = "argocd-bootstrap"
  chart     = "${path.module}/charts/argocd-bootstrap"
  namespace = "argocd"

  values = [yamlencode({
    repoURL        = var.gitops_repo_url
    targetRevision = var.gitops_revision
    appNamespaces  = keys(local.apps)
    # Everything the per-app Helm charts need that differs per student.
    # These flow root app -> child Applications -> app charts.
    global = {
      domain         = var.domain_name
      region         = var.region
      imageRegistry  = "${local.ecr_registry}/${local.name}"
      imageTags      = local.image_tags
      secretPrefix   = local.secret_prefix
      secretStore    = "aws-secrets-manager"
      gateway        = { name = "lab-gateway", namespace = "gateway" }
      repoURL        = var.gitops_repo_url
      targetRevision = var.gitops_revision
    }
  })]

  depends_on = [
    helm_release.argocd,
    helm_release.platform_routes,
    helm_release.external_secrets,
    helm_release.external_dns,
    helm_release.cluster_autoscaler,
    null_resource.build_images,
  ]
}
