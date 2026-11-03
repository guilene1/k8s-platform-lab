# EKS Pod Identity: one IAM role per platform component, each bound to exactly
# one Kubernetes service account. Every chart used here supports Pod Identity
# (it relies on the standard AWS SDK credential chain), so no IRSA is needed.

module "pod_identity_lbc" {
  source  = "terraform-aws-modules/eks-pod-identity/aws"
  version = "~> 2.10"

  name                            = "${local.name}-aws-lbc"
  attach_aws_lb_controller_policy = true

  associations = {
    this = {
      cluster_name    = module.eks.cluster_name
      namespace       = "kube-system"
      service_account = "aws-load-balancer-controller"
    }
  }
}

module "pod_identity_efs_csi" {
  source  = "terraform-aws-modules/eks-pod-identity/aws"
  version = "~> 2.10"

  name                      = "${local.name}-efs-csi"
  attach_aws_efs_csi_policy = true
  # The association is created by the aws-efs-csi-driver EKS add-on (eks.tf).
}

module "pod_identity_cluster_autoscaler" {
  source  = "terraform-aws-modules/eks-pod-identity/aws"
  version = "~> 2.10"

  name                             = "${local.name}-cluster-autoscaler"
  attach_cluster_autoscaler_policy = true
  cluster_autoscaler_cluster_names = [module.eks.cluster_name]

  associations = {
    this = {
      cluster_name    = module.eks.cluster_name
      namespace       = "kube-system"
      service_account = "cluster-autoscaler"
    }
  }
}

module "pod_identity_external_dns" {
  source  = "terraform-aws-modules/eks-pod-identity/aws"
  version = "~> 2.10"

  name                          = "${local.name}-external-dns"
  attach_external_dns_policy    = true
  external_dns_hosted_zone_arns = [data.aws_route53_zone.this.arn]

  associations = {
    this = {
      cluster_name    = module.eks.cluster_name
      namespace       = "external-dns"
      service_account = "external-dns"
    }
  }
}

module "pod_identity_external_secrets" {
  source  = "terraform-aws-modules/eks-pod-identity/aws"
  version = "~> 2.10"

  name                           = "${local.name}-external-secrets"
  attach_external_secrets_policy = true
  # Read-only access to this lab's secrets only (name prefix "<project>/").
  external_secrets_secrets_manager_arns = [
    "arn:${data.aws_partition.current.partition}:secretsmanager:${var.region}:${local.account_id}:secret:${local.secret_prefix}/*"
  ]
  external_secrets_create_permission = false

  associations = {
    this = {
      cluster_name    = module.eks.cluster_name
      namespace       = "external-secrets"
      service_account = "external-secrets"
    }
  }
}

# Grafana reads ALB (Gateway) metrics from CloudWatch for the platform
# overview dashboard.
module "pod_identity_grafana" {
  source  = "terraform-aws-modules/eks-pod-identity/aws"
  version = "~> 2.10"

  name                 = "${local.name}-grafana"
  attach_custom_policy = true
  policy_statements = [
    {
      sid = "CloudWatchRead"
      actions = [
        "cloudwatch:DescribeAlarmsForMetric",
        "cloudwatch:DescribeAlarmHistory",
        "cloudwatch:DescribeAlarms",
        "cloudwatch:ListMetrics",
        "cloudwatch:GetMetricData",
        "cloudwatch:GetInsightRuleReport",
        "ec2:DescribeRegions",
        "ec2:DescribeTags",
        "ec2:DescribeInstances",
        "tag:GetResources",
      ]
      resources = ["*"]
    }
  ]

  associations = {
    this = {
      cluster_name    = module.eks.cluster_name
      namespace       = "monitoring"
      service_account = "kube-prometheus-stack-grafana"
    }
  }
}
