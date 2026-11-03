###############################################################################
# Build the app images locally and push them to ECR.
#
# Each image is tagged with a hash of its source files, so changing an app's
# code and re-running `terraform apply` rebuilds just that image and rolls the
# new tag out through Argo CD (the tag flows in via the root Application).
###############################################################################

locals {
  # Only images whose source directory exists are built, so the lab can grow
  # app by app.
  buildable_images = {
    for key, img in local.app_images : key => merge(img, {
      context = abspath("${path.module}/../apps/${img.app}/${img.component}")
    })
    if fileexists("${path.module}/../apps/${img.app}/${img.component}/Dockerfile")
  }

  # Hash the source, not build output: node_modules/dist are never hashed.
  image_source_files = {
    for key, img in local.buildable_images : key => sort(setunion(
      fileset(img.context, "*"),
      fileset(img.context, "src/**"),
      fileset(img.context, "public/**"),
      fileset(img.context, "nginx/**"),
      fileset(img.context, "db/**"),
    ))
  }

  image_tags = {
    for key, files in local.image_source_files : key => substr(sha1(join("", [
      for f in files : filesha1("${local.buildable_images[key].context}/${f}")
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
    command     = "\"${abspath(path.module)}/scripts/build-push.sh\" \"$REPOSITORY\" \"$TAG\" \"$CONTEXT\" \"$PLATFORM\" \"$REGION\""
    environment = {
      REPOSITORY = aws_ecr_repository.app[each.key].repository_url
      TAG        = local.image_tags[each.key]
      CONTEXT    = each.value.context
      PLATFORM   = local.image_platform
      REGION     = var.region
    }
  }
}
