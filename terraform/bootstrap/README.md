# Terraform bootstrap

Run `./terraform/bootstrap/bootstrap.sh` after selecting the `sky-prod` gcloud configuration. It enables the required APIs and creates the versioned, uniform-access, public-access-prevented GCS state bucket. This is separate because Terraform cannot initialise a GCS backend before its bucket exists.

The Google provider uses Application Default Credentials. If ADC is missing, run `gcloud auth application-default login` and finish the browser sign-in before running Terraform. No credentials or secret values are created by the bootstrap.
