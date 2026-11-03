module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 21.29"

  name               = local.name
  kubernetes_version = var.kubernetes_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  endpoint_public_access       = true
  endpoint_private_access      = true
  endpoint_public_access_cidrs = var.endpoint_public_access_cidrs

  # Access entries (not the deprecated aws-auth ConfigMap). The identity that
  # runs `terraform apply` becomes cluster-admin, so the kubeconfig from
  # `aws eks update-kubeconfig` can do anything in the cluster from day one.
  authentication_mode                      = "API"
  enable_cluster_creator_admin_permissions = true
  access_entries = {
    for idx, arn in var.cluster_admin_principal_arns : "admin-${idx}" => {
      principal_arn = arn
      policy_associations = {
        admin = {
          policy_arn   = "arn:${data.aws_partition.current.partition}:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = { type = "cluster" }
        }
      }
    }
  }

  # Pod Identity is used for every AWS permission, so no IRSA/OIDC provider.
  enable_irsa = false

  # Lab clusters are short-lived; a 1-day log retention keeps cost near zero.
  enabled_log_types                      = ["api", "audit"]
  cloudwatch_log_group_retention_in_days = 1

  # Stay on standard support; never silently roll into extended support.
  upgrade_policy = {
    support_type = "STANDARD"
  }

  addons = {
    vpc-cni = {
      before_compute = true
    }
    eks-pod-identity-agent = {
      before_compute = true
    }
    kube-proxy = {}
    coredns    = {}
    metrics-server = {
      # Resource metrics for HPA and `kubectl top`.
    }
    aws-efs-csi-driver = {
      pod_identity_association = [{
        role_arn        = module.pod_identity_efs_csi.iam_role_arn
        service_account = "efs-csi-controller-sa"
      }]
    }
  }

  eks_managed_node_groups = {
    default = {
      ami_type       = local.node_ami_type
      instance_types = local.node_instance_types
      capacity_type  = "ON_DEMAND"

      min_size     = var.node_min_size
      max_size     = var.node_max_size
      desired_size = var.node_desired_size

      # Root volume only. The lab provides no EBS-backed persistent volumes.
      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 50
            volume_type           = "gp3"
            encrypted             = true
            delete_on_termination = true
          }
        }
      }

      labels = {
        "lab.utrains.io/pool" = "default"
      }
    }
  }

  node_security_group_additional_rules = {
    # The ALB reaches pods directly (target type ip); the LB controller adds
    # its own rules for that. This rule lets nodes talk to each other on all
    # ports, which webhooks and node-to-pod probes rely on.
    ingress_self_all = {
      description = "Node to node all ports/protocols"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      type        = "ingress"
      self        = true
    }
  }
}
