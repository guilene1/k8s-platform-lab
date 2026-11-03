###############################################################################
# Gateway API CRDs + AWS Load Balancer Controller (Gateway API mode)
#
# Install order: Gateway API CRDs -> LB controller -> platform-config (the
# GatewayClass/Gateway, see platform-config.tf).
###############################################################################

# Upstream Gateway API *standard channel* CRDs. v1.6.3 is pinned because the
# AWS Load Balancer Controller docs state the controller is built for Gateway
# API v1.6 and list the standard install as required. Shipped as a tiny local
# chart so no kubectl is needed and nothing is fetched at apply time.
resource "helm_release" "gateway_api_crds" {
  name      = "gateway-api-crds"
  chart     = "${path.module}/charts/gateway-api-crds"
  namespace = "kube-system"

  depends_on = [module.eks]
}

resource "helm_release" "aws_lb_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  version    = "3.6.2"
  namespace  = "kube-system"

  # The chart's crds/ directory also installs the controller's own
  # gateway.k8s.aws CRDs (LoadBalancerConfiguration, TargetGroupConfiguration,
  # ListenerRuleConfiguration).
  values = [yamlencode({
    clusterName  = module.eks.cluster_name
    region       = var.region
    vpcId        = module.vpc.vpc_id
    replicaCount = 2
    serviceAccount = {
      create = true
      name   = "aws-load-balancer-controller"
    }
    controllerConfig = {
      featureGates = {
        ALBGatewayAPI = true
        NLBGatewayAPI = false
      }
    }
    # Don't intercept every Service students create; they can still opt in to
    # NLBs with the usual annotations.
    enableServiceMutatorWebhook = false
    resources = {
      requests = { cpu = "50m", memory = "128Mi" }
      limits   = { memory = "512Mi" }
    }
  })]

  wait    = true
  timeout = 600

  depends_on = [
    helm_release.gateway_api_crds,
    module.pod_identity_lbc,
  ]
}
