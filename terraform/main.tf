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

module "ec2" {
  count  = var.enable_ec2 ? 1 : 0
  source = "./ec2"

  app_name         = var.app_name
  environment      = var.environment
  vpc_id           = module.vpc.vpc_id
  public_subnet_id = module.vpc.public_subnet_ids[0]

  instance_type     = var.ec2_instance_type
  ssh_key_name      = var.ec2_ssh_key_name
  ssh_ingress_cidrs = var.ec2_ssh_ingress_cidrs
}

module "route53" {
  source = "./route53"

  route53_zone_id = aws_route53_zone.main.zone_id
  domain_name     = "api.${var.domain_name}"

  # api.allrecords.me now points directly to the EC2 Elastic IP
  ec2_public_ip = module.ec2[0].public_ip
}
