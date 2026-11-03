provider "aws" {
  region = var.region

  default_tags {
    tags = local.tags
  }
}

# Everything inside the cluster is installed through Helm - including the lab's
# own custom resources (Gateway, ClusterSecretStore, Argo CD Applications),
# packaged as small local charts in charts/. Unlike kubernetes_manifest, a
# helm_release can be planned before the cluster and its CRDs exist, which is
# what makes a single `terraform apply` from zero possible.
#
# Authentication uses a short-lived token from `aws eks get-token`, so
# Terraform needs no kubeconfig file.
provider "helm" {
  kubernetes = {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    exec = {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name, "--region", var.region]
    }
  }
}
