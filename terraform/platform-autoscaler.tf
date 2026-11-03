###############################################################################
# Cluster Autoscaler for the managed node group. EKS tags managed node group
# Auto Scaling groups with the k8s.io/cluster-autoscaler/* discovery tags
# automatically. (metrics-server is installed as an EKS add-on in eks.tf.)
###############################################################################

resource "helm_release" "cluster_autoscaler" {
  name       = "cluster-autoscaler"
  repository = "https://kubernetes.github.io/autoscaler"
  chart      = "cluster-autoscaler"
  version    = "9.60.0" # app version 1.37.0, matching the cluster minor version
  namespace  = "kube-system"

  values = [yamlencode({
    autoDiscovery = {
      clusterName = module.eks.cluster_name
    }
    awsRegion = var.region
    rbac = {
      serviceAccount = {
        create = true
        name   = "cluster-autoscaler"
      }
    }
    extraArgs = {
      "balance-similar-node-groups"   = true
      "expander"                      = "least-waste"
      "skip-nodes-with-local-storage" = false # Prometheus/Grafana use emptyDir
      "scale-down-unneeded-time"      = "10m"
    }
    resources = {
      requests = { cpu = "20m", memory = "128Mi" }
      limits   = { memory = "512Mi" }
    }
  })]

  wait    = true
  timeout = 600

  depends_on = [
    module.eks,
    module.pod_identity_cluster_autoscaler,
  ]
}
