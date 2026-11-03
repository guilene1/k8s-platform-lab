data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

data "aws_route53_zone" "this" {
  name         = var.domain_name
  private_zone = false
}

locals {
  name       = var.project_name
  account_id = data.aws_caller_identity.current.account_id
  azs        = slice(data.aws_availability_zones.available.names, 0, 3)

  tags = merge(
    {
      Project   = var.project_name
      ManagedBy = "terraform"
      Lab       = "k8s-platform-lab"
    },
    var.tags,
  )

  # The 10 lab applications. `name` is the namespace, the Argo CD Application
  # name, the database name and the ECR repository prefix. `host` is the
  # subdomain under var.domain_name.
  apps = {
    shopline   = { host = "shop", title = "ShopLine", efs = false }
    northbank  = { host = "bank", title = "Northbank", efs = false }
    quickplate = { host = "food", title = "QuickPlate", efs = false }
    staywell   = { host = "stay", title = "StayWell", efs = false }
    homefinder = { host = "homes", title = "HomeFinder", efs = true }
    hirehub    = { host = "jobs", title = "HireHub", efs = true }
    careslot   = { host = "care", title = "CareSlot", efs = false }
    ticketwave = { host = "tickets", title = "TicketWave", efs = false }
    fittrack   = { host = "fit", title = "FitTrack", efs = false }
    drivenow   = { host = "drive", title = "DriveNow", efs = true }
  }

  # Each app ships two images: the API and the web frontend.
  app_components = ["api", "web"]
  app_images = {
    for pair in setproduct(keys(local.apps), local.app_components) :
    "${pair[0]}-${pair[1]}" => { app = pair[0], component = pair[1] }
  }

  ecr_registry = "${local.account_id}.dkr.ecr.${var.region}.amazonaws.com"

  # Secrets Manager names all live under this prefix so IAM can scope to it.
  secret_prefix = local.name

  node_instance_types = length(var.node_instance_types) > 0 ? var.node_instance_types : (
    var.node_architecture == "arm64" ? ["m7g.xlarge"] : ["m7i.xlarge"]
  )
  node_ami_type  = var.node_architecture == "arm64" ? "AL2023_ARM_64_STANDARD" : "AL2023_x86_64_STANDARD"
  image_platform = var.node_architecture == "arm64" ? "linux/arm64" : "linux/amd64"

  platform_hosts = {
    argocd  = "argocd.${var.domain_name}"
    grafana = "grafana.${var.domain_name}"
  }
}
