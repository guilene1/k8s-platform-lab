###############################################################################
# Build the app images locally and push them to ECR.
#
# Each image is tagged with a hash of its source files, so changing an app's
# code and re-running `terraform apply` rebuilds just that image and rolls the
# new tag out through Argo CD (the tag flows in via the root Application).
###############################################################################

locals {
  apps_dir = abspath("${path.module}/../apps")

  # Only images whose Dockerfile exists are built, so the lab can grow app by
  # app. The build context is apps/ so images can include the shared kits
  # (apps/shared/api-kit, apps/shared/web-kit); each Dockerfile has its own
  # Dockerfile.dockerignore that limits the context to what it needs.
  buildable_images = {
    for key, img in local.app_images : key => merge(img, {
      dir        = "${local.apps_dir}/${img.app}/${img.component}"
      dockerfile = "${local.apps_dir}/${img.app}/${img.component}/Dockerfile"
      kit        = "${local.apps_dir}/shared/${img.component}-kit"
    })
    if fileexists("${local.apps_dir}/${img.app}/${img.component}/Dockerfile")
  }

  # Hash the source (the component + its shared kit), never build output:
  # node_modules/ and dist/ are not part of the hash.
  image_source_files = {
    for key, img in local.buildable_images : key => concat(
      [for f in sort(setunion(
        fileset(img.dir, "*"),
        fileset(img.dir, "src/**"),
        fileset(img.dir, "public/**"),
        fileset(img.dir, "db/**"),
      )) : "${img.dir}/${f}"],
      [for f in sort(fileset(img.kit, "**")) : "${img.kit}/${f}"],
    )
  }

  image_tags = {
    for key, files in local.image_source_files : key => substr(sha1(join("", [
      for f in files : filesha1(f)
    ])), 0, 12)
  }
}

resource "null_resource" "build_images" {
  for_each = var.build_images ? local.buildable_images : {}

  triggers = {
    tag        = local.image_tags[each.key]
    repository = aws_ecr_repository.app[each.key].repository_url
    platform   = local.image_platform
  }

  provisioner "local-exec" {
    interpreter = ["bash", "-c"]
    command     = "\"${abspath(path.module)}/scripts/build-push.sh\" \"$REPOSITORY\" \"$TAG\" \"$CONTEXT\" \"$DOCKERFILE\" \"$PLATFORM\" \"$REGION\""
    environment = {
      REPOSITORY = aws_ecr_repository.app[each.key].repository_url
      TAG        = local.image_tags[each.key]
      CONTEXT    = local.apps_dir
      DOCKERFILE = each.value.dockerfile
      PLATFORM   = local.image_platform
      REGION     = var.region
    }
  }
}
