###############################################################################
# Clean destroy.
#
# The classic EKS teardown failure: controllers create AWS resources Terraform
# doesn't know about (the Gateway's ALB, target groups, security groups, EFS
# access points, Route 53 records). If Terraform removes the controllers or
# the VPC first, those orphans block subnet/VPC deletion.
#
# This resource depends on every platform component, so Terraform destroys it
# FIRST. Its destroy-time script, while all controllers are still running:
#   1. deletes the root Argo CD app and waits for all lab apps to be gone
#   2. deletes every HTTPRoute (incl. students') and waits for external-dns
#      to remove the Route 53 records it created
#   3. deletes the Gateway -> the LB controller deletes the ALB + target groups
#      (also deletes Services of type LoadBalancer and Ingresses students made)
#   4. deletes EFS-backed PVCs -> the EFS CSI driver deletes the access points
#   5. verifies with the AWS API and removes any leftovers
# Only then are the controllers, EFS mount targets, cluster and VPC destroyed.
###############################################################################

resource "null_resource" "destroy_cleanup" {
  triggers = {
    cluster_name = module.eks.cluster_name
    region       = var.region
    zone_id      = data.aws_route53_zone.this.zone_id
    owner_id     = local.name
    efs_id       = aws_efs_file_system.this.id
    vpc_id       = module.vpc.vpc_id
    script       = abspath("${path.module}/scripts/destroy-cleanup.sh")
  }

  provisioner "local-exec" {
    when        = destroy
    interpreter = ["bash", "-c"]
    command     = "\"${self.triggers.script}\""
    environment = {
      CLUSTER_NAME = self.triggers.cluster_name
      AWS_REGION   = self.triggers.region
      ZONE_ID      = self.triggers.zone_id
      OWNER_ID     = self.triggers.owner_id
      EFS_ID       = self.triggers.efs_id
      VPC_ID       = self.triggers.vpc_id
    }
  }

  depends_on = [
    helm_release.argocd_bootstrap,
    helm_release.platform_routes,
    helm_release.argocd,
    helm_release.kube_prometheus_stack,
    helm_release.platform_config,
    helm_release.external_dns,
    helm_release.external_secrets,
    helm_release.aws_lb_controller,
    helm_release.cluster_autoscaler,
    helm_release.gateway_api_crds,
    aws_efs_mount_target.this,
    module.pod_identity_lbc,
    module.pod_identity_external_dns,
    module.pod_identity_efs_csi,
    module.eks,
    module.vpc,
  ]
}
