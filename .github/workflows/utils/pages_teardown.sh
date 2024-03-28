#!/bin/bash

# Pages Teardown
#
# Deletes all preview or production branches in a Cloudflare Pages project.
# Requires the following command line arguments delimited by spaces, as
# described in the variable names below.

PAGES_PROJECT_NAME=$1
PAGES_BRANCH=$2
CF_ACCOUNT_ID=$3
CF_API_TOKEN=$4

# Hit Cloudflare GET Deployments Route
res=$(
  curl --request GET \
    --url https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/pages/projects/$PAGES_PROJECT_NAME/deployments \
    --header "Content-Type: application/json" \
    --header "Authorization: Bearer ${CF_API_TOKEN}"
)

deployments_length=$(echo "${res}" | jq '.result | length')

# Loop over each deployment
for ((i=0; i<$deployments_length; i++)); do

  deployment_branch=$(echo "${res}" | jq -c ".result[$i].deployment_trigger.metadata.branch")

  
  # Check if the branch of the deployment matches with the PAGES_BRANCH
  if [[ ${deployment_branch//\"/} == "${PAGES_BRANCH}" ]]; then
  
    deployment_id=$(echo "${res}" | jq -c ".result[$i].id")
    echo "Deleting Deployment ID: ${deployment_id//\"/}"
  
    curl --request DELETE \
      --url https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/pages/projects/$PAGES_PROJECT_NAME/deployments/${deployment_id//\"/}?force=true \
      --header "Content-Type: application/json" \
      --header "Authorization: Bearer ${CF_API_TOKEN}"
  fi
done