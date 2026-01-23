terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "eunsun-family-backend-terraform-state"
    key            = "terraform.tfstate"
    region         = "ap-northeast-2"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "eunsun_family_backend"
      Service     = var.service_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = {
    Name        = "${var.app_name}-zone"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

module "vpc" {
  source = "./vpc"

  app_name    = var.app_name
  environment = var.environment
}

module "ecr" {
  source = "./ecr"

  repository_name = var.app_name
  environment     = var.environment
}

module "cloudwatch" {
  source = "./cloudwatch"

  app_name    = var.app_name
  environment = var.environment
}

module "acm" {
  source = "./acm"

  app_name        = var.app_name
  environment     = var.environment
  domain_name     = "api.${var.domain_name}"
  route53_zone_id = aws_route53_zone.main.zone_id
}

module "alb" {
  source = "./alb"

  app_name            = var.app_name
  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  public_subnet_ids   = module.vpc.public_subnet_ids
  acm_certificate_arn = module.acm.certificate_validation_arn

  depends_on = [module.acm]
}

module "ecs" {
  source = "./ecs"

  app_name              = var.app_name
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  subnet_ids            = module.vpc.public_subnet_ids
  alb_security_group_id = module.alb.alb_security_group_id
  target_group_arn      = module.alb.target_group_arn
  alb_listener_arn      = module.alb.https_listener_arn
  ecr_repository_url    = module.ecr.repository_url
  image_tag             = var.image_tag
  log_group_name        = module.cloudwatch.log_group_name
  aws_region            = var.aws_region
}

module "route53" {
  source = "./route53"

  route53_zone_id = aws_route53_zone.main.zone_id
  domain_name     = "api.${var.domain_name}"
  alb_dns_name    = module.alb.alb_dns_name
  alb_zone_id     = module.alb.alb_zone_id
}
