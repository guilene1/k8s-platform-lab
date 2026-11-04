{{/* ----------------------------------------------------------------------
  Naming and labels. Every object carries the standard app.kubernetes.io
  labels; selectors use only name + component, which never change.
---------------------------------------------------------------------- */}}

{{- define "lab-app.name" -}}
{{- required "app.name is required" .Values.app.name -}}
{{- end -}}

{{- define "lab-app.selector" -}}
app.kubernetes.io/name: {{ include "lab-app.name" .root }}
app.kubernetes.io/component: {{ .component }}
{{- end -}}

{{- define "lab-app.labels" -}}
{{ include "lab-app.selector" . }}
app.kubernetes.io/part-of: k8s-platform-lab
app.kubernetes.io/managed-by: {{ .root.Release.Service }}
{{- with .version }}
app.kubernetes.io/version: {{ . | quote }}
{{- end }}
{{- end -}}

{{/* Image reference: <registry>/<app>-<component>:<tag>. The registry and the
     tags are injected by Terraform through the root Argo CD Application. */}}
{{- define "lab-app.image" -}}
{{- $g := .root.Values.global -}}
{{- $key := printf "%s-%s" (include "lab-app.name" .root) .component -}}
{{- $tag := index ($g.imageTags | default dict) $key | default "" -}}
{{- $tag = required (printf "global.imageTags.%s is required (set by Terraform)" $key) $tag -}}
{{- printf "%s/%s:%s" (required "global.imageRegistry is required" $g.imageRegistry) $key $tag -}}
{{- end -}}

{{- define "lab-app.tag" -}}
{{- index (.root.Values.global.imageTags | default dict) (printf "%s-%s" (include "lab-app.name" .root) .component) | default "" -}}
{{- end -}}

{{- define "lab-app.host" -}}
{{- printf "%s.%s" (required "app.host is required" .Values.app.host) (required "global.domain is required" .Values.global.domain) -}}
{{- end -}}

{{- define "lab-app.apiUrl" -}}
{{- printf "http://%s-api.%s.svc.cluster.local:%v" (include "lab-app.name" .) .Release.Namespace .Values.api.port -}}
{{- end -}}

{{/* Restricted-profile security settings shared by every container. */}}
{{- define "lab-app.containerSecurity" -}}
allowPrivilegeEscalation: false
readOnlyRootFilesystem: true
runAsNonRoot: true
capabilities:
  drop: ["ALL"]
{{- end -}}

{{/* Spread replicas across zones and nodes when possible. */}}
{{- define "lab-app.spread" -}}
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: ScheduleAnyway
    labelSelector:
      matchLabels:
        {{- include "lab-app.selector" . | nindent 8 }}
  - maxSkew: 1
    topologyKey: kubernetes.io/hostname
    whenUnsatisfiable: ScheduleAnyway
    labelSelector:
      matchLabels:
        {{- include "lab-app.selector" . | nindent 8 }}
{{- end -}}
