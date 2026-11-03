###############################################################################
# Cluster-wide platform objects (charts/platform-config):
#   - GatewayClass + the shared Gateway (one internet-facing ALB) in "gateway"
#   - HTTP -> HTTPS redirect route
#   - efs-sc StorageClass (EFS access points, ReadWriteMany)
#   - ClusterSecretStore for Secrets Manager + Grafana admin ExternalSecret
#
# A local Helm chart (not kubernetes_manifest) is used on purpose: custom
# resources can then be planned before their CRDs exist in a fresh cluster.
###############################################################################

resource "helm_release" "platform_config" {
  name             = "platform-config"
  chart            = "${path.module}/charts/platform-config"
  namespace        = "gateway"
  create_namespace = true

  values = [yamlencode({
    region          = var.region
    domain          = var.domain_name
    certificateArn  = aws_acm_certificate_validation.wildcard.certificate_arn
    efsFileSystemId = aws_efs_file_system.this.id
    secretPrefix    = local.secret_prefix
  })]

  depends_on = [
    helm_release.aws_lb_controller, # GatewayClass/Gateway + gateway.k8s.aws CRDs
    helm_release.external_secrets,  # ClusterSecretStore/ExternalSecret CRDs + webhook
    aws_efs_mount_target.this,      # StorageClass is only usable with mount targets
    module.eks,                     # EFS CSI add-on
  ]
}
