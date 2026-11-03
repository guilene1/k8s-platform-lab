###############################################################################
# external-dns: watches HTTPRoute hostnames and creates Route 53 alias records
# pointing at the Gateway's ALB, in the student's hosted zone only.
#
# policy=sync means external-dns also DELETES records whose HTTPRoute is gone.
# During `terraform destroy` the cleanup step (destroy.tf) removes all routes
# first and waits for external-dns to delete the records before external-dns
# itself is uninstalled.
###############################################################################

resource "helm_release" "external_dns" {
  name             = "external-dns"
  repository       = "https://kubernetes-sigs.github.io/external-dns/"
  chart            = "external-dns"
  version          = "1.23.0"
  namespace        = "external-dns"
  create_namespace = true

  values = [yamlencode({
    provider = { name = "aws" }
    sources  = ["gateway-httproute"]
    policy   = "sync"
    registry = "txt"
    # Ownership marker: external-dns only ever modifies records it created
    # with this owner id, so pre-existing records in the zone are safe.
    txtOwnerId    = local.name
    domainFilters = [var.domain_name]
    interval      = "30s"
    serviceAccount = {
      create = true
      name   = "external-dns"
    }
    env = [
      { name = "AWS_DEFAULT_REGION", value = var.region },
    ]
    extraArgs = [
      "--aws-zone-type=public",
      "--zone-id-filter=${data.aws_route53_zone.this.zone_id}",
    ]
    resources = {
      requests = { cpu = "10m", memory = "64Mi" }
      limits   = { memory = "256Mi" }
    }
  })]

  wait    = true
  timeout = 600

  depends_on = [
    module.eks,
    helm_release.gateway_api_crds,
    module.pod_identity_external_dns,
  ]
}
