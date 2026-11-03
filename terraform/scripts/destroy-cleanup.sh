#!/usr/bin/env bash
# Runs at the start of `terraform destroy` (see destroy.tf), while every
# controller is still running. Removes everything controllers created in AWS
# so the VPC, subnets and EFS can be deleted cleanly. Idempotent: safe to run
# again, and safe to run by hand with the same environment variables:
#
#   CLUSTER_NAME=k8slab AWS_REGION=us-east-1 ZONE_ID=Z123 OWNER_ID=k8slab \
#   EFS_ID=fs-123 VPC_ID=vpc-123 ./destroy-cleanup.sh
set -uo pipefail

: "${CLUSTER_NAME:?}" "${AWS_REGION:?}" "${ZONE_ID:?}" "${OWNER_ID:?}" "${EFS_ID:?}" "${VPC_ID:?}"
export AWS_REGION AWS_DEFAULT_REGION="$AWS_REGION"

log() { printf '\n[cleanup] %s\n' "$*"; }

# wait_until <timeout-seconds> <description> <command...>
wait_until() {
  local timeout="$1" what="$2"; shift 2
  local start=$SECONDS
  until "$@"; do
    if (( SECONDS - start >= timeout )); then
      log "timed out after ${timeout}s waiting for: $what"
      return 1
    fi
    sleep 10
  done
  log "done: $what"
}

KUBECONFIG="$(mktemp)"
export KUBECONFIG
trap 'rm -f "$KUBECONFIG"' EXIT

k8s_ok=false
if aws eks describe-cluster --name "$CLUSTER_NAME" >/dev/null 2>&1 &&
   aws eks update-kubeconfig --name "$CLUSTER_NAME" --kubeconfig "$KUBECONFIG" >/dev/null &&
   kubectl version --request-timeout=15s >/dev/null 2>&1; then
  k8s_ok=true
else
  log "cluster not reachable - skipping in-cluster cleanup, running AWS checks only"
fi

has_crd() { kubectl get crd "$1" >/dev/null 2>&1; }
none_left() { [ -z "$(kubectl get "$@" -o name 2>/dev/null)" ]; }

if $k8s_ok; then
  # 1. Argo CD apps. Deleting the root app cascades (finalizers) to every
  #    child app and the resources it deployed - including their HTTPRoutes,
  #    so external-dns starts removing their DNS records.
  if has_crd applications.argoproj.io; then
    log "deleting Argo CD root application (cascades to all lab apps)"
    kubectl -n argocd delete application root --wait=false --ignore-not-found
    if ! wait_until 600 "all Argo CD applications deleted" none_left applications.argoproj.io -n argocd; then
      log "forcing: removing finalizers from remaining applications"
      for app in $(kubectl -n argocd get applications.argoproj.io -o name); do
        kubectl -n argocd patch "$app" --type merge -p '{"metadata":{"finalizers":null}}'
      done
      kubectl -n argocd delete applications.argoproj.io --all --wait=false
    fi
  fi

  # 2. Every remaining route in the cluster (platform UIs, students' own).
  for kind in httproutes.gateway.networking.k8s.io grpcroutes.gateway.networking.k8s.io; do
    if has_crd "$kind"; then
      log "deleting all $kind"
      kubectl delete "$kind" --all -A --wait=true --timeout=120s
    fi
  done

  # Things students may have created that also make AWS load balancers.
  log "deleting Services of type LoadBalancer and Ingresses"
  kubectl get svc -A -o jsonpath='{range .items[?(@.spec.type=="LoadBalancer")]}{.metadata.namespace}{" "}{.metadata.name}{"\n"}{end}' |
    while read -r ns name; do [ -n "$ns" ] && kubectl -n "$ns" delete svc "$name" --wait=false; done
  kubectl delete ingress --all -A --wait=false 2>/dev/null
fi

# 3. DNS: wait for external-dns (still running) to delete its records.
#    Ownership TXT records carry "external-dns/owner=<OWNER_ID>".
owned_txt() {
  aws route53 list-resource-record-sets --hosted-zone-id "$ZONE_ID" \
    --query "ResourceRecordSets[?Type=='TXT' && contains(join('', ResourceRecords[].Value), 'external-dns/owner=${OWNER_ID}')].Name" \
    --output text 2>/dev/null | tr '\t' '\n' | sed '/^None$/d;/^$/d'
}
no_owned_records() { [ -z "$(owned_txt)" ]; }

if ! wait_until 300 "external-dns removed its Route 53 records" no_owned_records; then
  log "removing leftover external-dns records directly"
  for txt in $(owned_txt); do
    # TXT names are "a-<host>", "aaaa-<host>", "cname-<host>" or "<host>".
    host="${txt#a-}"; host="${host#aaaa-}"; host="${host#cname-}"
    for type in A AAAA CNAME TXT; do
      name="$host"; [ "$type" = TXT ] && name="$txt"
      rrset=$(aws route53 list-resource-record-sets --hosted-zone-id "$ZONE_ID" \
        --query "ResourceRecordSets[?Name=='${name}' && Type=='${type}'] | [0]" --output json)
      if [ "$rrset" != "null" ] && [ -n "$rrset" ]; then
        if [ "$type" = TXT ] || [ "$type" = CNAME ] || echo "$rrset" | grep -q AliasTarget; then
          aws route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" \
            --change-batch "{\"Changes\":[{\"Action\":\"DELETE\",\"ResourceRecordSet\":${rrset}}]}" >/dev/null &&
            echo "  deleted $type $name"
        fi
      fi
    done
  done
fi

if $k8s_ok; then
  # 4. The Gateway. The LB controller's finalizer deletes the ALB, its
  #    listeners, target groups and security groups before the object goes.
  if has_crd gateways.gateway.networking.k8s.io; then
    log "deleting Gateways (the LB controller removes the ALB)"
    kubectl delete gateways.gateway.networking.k8s.io --all -A --wait=true --timeout=600s
  fi

  # 5. EFS-backed volumes, so the CSI driver deletes their access points.
  log "deleting PVCs that use the efs-sc StorageClass"
  kubectl get pvc -A -o jsonpath='{range .items[?(@.spec.storageClassName=="efs-sc")]}{.metadata.namespace}{" "}{.metadata.name}{"\n"}{end}' |
    while read -r ns name; do [ -n "$ns" ] && kubectl -n "$ns" delete pvc "$name" --wait=false; done
  efs_pvs_gone() { [ -z "$(kubectl get pv -o jsonpath='{.items[?(@.spec.storageClassName=="efs-sc")].metadata.name}' 2>/dev/null)" ]; }
  wait_until 300 "EFS persistent volumes deleted" efs_pvs_gone
fi

# 6. Verify with the AWS API and remove anything the controllers left behind.
tagged() {
  aws resourcegroupstaggingapi get-resources \
    --tag-filters "Key=elbv2.k8s.aws/cluster,Values=${CLUSTER_NAME}" \
    --resource-type-filters "$1" \
    --query 'ResourceTagMappingList[].ResourceARN' --output text 2>/dev/null | tr '\t' '\n' | sed '/^None$/d;/^$/d'
}
no_lbs() { [ -z "$(tagged elasticloadbalancing:loadbalancer)" ]; }

if ! wait_until 300 "controller-created load balancers deleted" no_lbs; then
  for arn in $(tagged elasticloadbalancing:loadbalancer); do
    log "deleting leftover load balancer $arn"
    aws elbv2 delete-load-balancer --load-balancer-arn "$arn"
  done
  wait_until 300 "leftover load balancers deleted" no_lbs
fi

for arn in $(tagged elasticloadbalancing:targetgroup); do
  log "deleting leftover target group $arn"
  aws elbv2 delete-target-group --target-group-arn "$arn" || true
done

# Security groups the controller created (they can linger while ENIs detach).
sg_ids() {
  aws ec2 describe-security-groups \
    --filters "Name=vpc-id,Values=${VPC_ID}" "Name=tag:elbv2.k8s.aws/cluster,Values=${CLUSTER_NAME}" \
    --query 'SecurityGroups[].GroupId' --output text 2>/dev/null | tr '\t' '\n' | sed '/^None$/d;/^$/d'
}
delete_sgs() {
  local left=0
  for sg in $(sg_ids); do
    # Drop rules in other groups (e.g. the node SG) that reference this SG.
    for ref in $(aws ec2 describe-security-group-rules \
        --filters "Name=referenced-group-info.group-id,Values=${sg}" \
        --query 'SecurityGroupRules[].[GroupId,SecurityGroupRuleId]' --output text 2>/dev/null | tr '\t' ':' ); do
      aws ec2 revoke-security-group-ingress --group-id "${ref%%:*}" --security-group-rule-ids "${ref##*:}" >/dev/null 2>&1
    done
    aws ec2 delete-security-group --group-id "$sg" >/dev/null 2>&1 && echo "  deleted $sg" || left=1
  done
  return $left
}
wait_until 300 "controller security groups deleted" delete_sgs

# EFS access points (the file system belongs to this lab only).
for ap in $(aws efs describe-access-points --file-system-id "$EFS_ID" \
              --query 'AccessPoints[].AccessPointId' --output text 2>/dev/null | tr '\t' '\n' | sed '/^None$/d;/^$/d'); do
  log "deleting leftover EFS access point $ap"
  aws efs delete-access-point --access-point-id "$ap"
done

log "cleanup complete - Terraform will now remove the platform, cluster and VPC"
exit 0
