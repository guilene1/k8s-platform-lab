###############################################################################
# External Secrets Operator: syncs Secrets Manager -> Kubernetes Secrets.
# The ClusterSecretStore it uses is created in platform-config.
###############################################################################

resource "helm_release" "external_secrets" {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  version          = "2.14.0"
  namespace        = "external-secrets"
  create_namespace = true

  values = [yamlencode({
    installCRDs = true
    serviceAccount = {
      create = true
      name   = "external-secrets"
    }
    resources = {
      requests = { cpu = "20m", memory = "64Mi" }
      limits   = { memory = "256Mi" }
    }
  })]

  wait    = true
  timeout = 600

  depends_on = [
    module.eks,
    module.pod_identity_external_secrets,
  ]
}
