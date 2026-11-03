# Shared ReadWriteMany storage. The EFS CSI driver creates one access point per
# PersistentVolumeClaim (dynamic provisioning via the efs-sc StorageClass).

resource "aws_security_group" "efs" {
  name        = "${local.name}-efs"
  description = "NFS access to EFS from EKS pods"
  vpc_id      = module.vpc.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "efs_from_nodes" {
  security_group_id            = aws_security_group.efs.id
  description                  = "NFS from EKS nodes and pods"
  ip_protocol                  = "tcp"
  from_port                    = 2049
  to_port                      = 2049
  referenced_security_group_id = module.eks.node_security_group_id
}

resource "aws_efs_file_system" "this" {
  creation_token   = "${local.name}-efs"
  encrypted        = true
  performance_mode = "generalPurpose"
  throughput_mode  = "elastic"

  tags = {
    Name = "${local.name}-efs"
  }
}

resource "aws_efs_mount_target" "this" {
  count = length(module.vpc.private_subnets)

  file_system_id  = aws_efs_file_system.this.id
  subnet_id       = module.vpc.private_subnets[count.index]
  security_groups = [aws_security_group.efs.id]
}
