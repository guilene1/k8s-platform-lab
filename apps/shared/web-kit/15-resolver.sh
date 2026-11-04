#!/bin/sh
# Runs from /docker-entrypoint.d before nginx starts (the image runs these
# scripts in order). Points nginx's resolver at the pod's DNS server
# (CoreDNS in Kubernetes) so /api/ upstreams are resolved at request time.
set -eu

ns="$(awk '/^nameserver/ { print $2; exit }' /etc/resolv.conf)"
[ -n "$ns" ] || ns="127.0.0.11"
# IPv6 nameservers need brackets in nginx syntax.
case "$ns" in *:*) ns="[$ns]" ;; esac

echo "resolver ${ns} valid=10s ipv6=off;" > /etc/nginx/conf.d/00-resolver.conf
echo "15-resolver.sh: using DNS server ${ns}"
