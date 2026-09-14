#!/usr/bin/env bash
# One-time: connect the Twilio number to the Retell agent for inbound calls.
#
#   bash agent/connect-number.sh
#
# Creates a Twilio Elastic SIP trunk (credential auth, origination to Retell),
# moves the number's voice side onto it, imports the number into Retell bound
# to the agent, and appends the trunk ids and SIP credentials to .env.
# Messaging config on the number (sms_url to n8n) is untouched; the read-back
# at the end shows it. Safe to re-run only after deleting what it created:
# it does not check for existing trunks.
#
# Sources (read 2026-09-14): docs.retellai.com/deploy/twilio,
# docs.retellai.com/api-references/import-phone-number,
# twilio.com/docs/sip-trunking/api/{trunk,originationurl,credentiallist,phonenumber}-resource,
# twilio.com/docs/voice/sip/api/sip-credential-resource
set -euo pipefail
cd "$(dirname "$0")/.."

env_get() { grep "^$1=" .env | cut -d= -f2- | tr -d '"'; }
SID=$(env_get TWILIO_ACCOUNT_SID); TOK=$(env_get TWILIO_AUTH_TOKEN)
RKEY=$(env_get RETELL_API_KEY); AGENT=$(env_get RETELL_AGENT_ID); NUMBER=$(env_get TWILIO_PHONE_NUMBER)
DOMAIN=dryrun-plumbing-retell.pstn.twilio.com
USERNAME=dryrun-retell
# Twilio wants 12+ chars, mixed case, a digit.
PASSWORD=$(node -e 'const c=require("crypto");const a="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";let p="";for(let i=0;i<22;i++)p+=a[c.randomInt(a.length)];console.log("Dr"+p+"7")')
field() { node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);const v=j['"'$1'"'];console.log(v===undefined?JSON.stringify(j).slice(0,300):v)})'; }

echo "0. number sid"
PN=$(curl -sf -u "$SID:$TOK" "https://api.twilio.com/2010-04-01/Accounts/$SID/IncomingPhoneNumbers.json?PhoneNumber=$(printf %s "$NUMBER" | sed 's/+/%2B/')" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).incoming_phone_numbers[0].sid))')
echo "   $NUMBER -> $PN"

echo "1. credential list"
CL=$(curl -sf -u "$SID:$TOK" -X POST "https://api.twilio.com/2010-04-01/Accounts/$SID/SIP/CredentialLists.json" --data-urlencode "FriendlyName=Dry Run Plumbing to Retell" | field sid); echo "   $CL"
echo "2. credential"
curl -sf -u "$SID:$TOK" -X POST "https://api.twilio.com/2010-04-01/Accounts/$SID/SIP/CredentialLists/$CL/Credentials.json" --data-urlencode "Username=$USERNAME" --data-urlencode "Password=$PASSWORD" | field username
echo "3. trunk"
TK=$(curl -sf -u "$SID:$TOK" -X POST "https://trunking.twilio.com/v1/Trunks" --data-urlencode "FriendlyName=Dry Run Plumbing to Retell" --data-urlencode "DomainName=$DOMAIN" | field sid); echo "   $TK"
echo "4. credential list on trunk"
curl -sf -u "$SID:$TOK" -X POST "https://trunking.twilio.com/v1/Trunks/$TK/CredentialLists" --data-urlencode "CredentialListSid=$CL" | field sid
echo "5. origination to Retell"
curl -sf -u "$SID:$TOK" -X POST "https://trunking.twilio.com/v1/Trunks/$TK/OriginationUrls" --data-urlencode "SipUrl=sip:sip.retellai.com" --data-urlencode "Priority=10" --data-urlencode "Weight=10" --data-urlencode "Enabled=true" --data-urlencode "FriendlyName=Retell" | field sip_url
echo "6. number onto trunk"
curl -sf -u "$SID:$TOK" -X POST "https://trunking.twilio.com/v1/Trunks/$TK/PhoneNumbers" --data-urlencode "PhoneNumberSid=$PN" | field phone_number
echo "7. Retell import, bound to agent $AGENT"
curl -sf -X POST "https://api.retellai.com/import-phone-number" -H "Authorization: Bearer $RKEY" -H "Content-Type: application/json" \
  -d "{\"phone_number\":\"$NUMBER\",\"termination_uri\":\"$DOMAIN\",\"sip_trunk_auth_username\":\"$USERNAME\",\"sip_trunk_auth_password\":\"$PASSWORD\",\"inbound_agents\":[{\"agent_id\":\"$AGENT\",\"weight\":1}],\"nickname\":\"Dry Run Plumbing Twilio\"}" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);console.log("   "+JSON.stringify({phone_number:j.phone_number,type:j.phone_number_type,inbound_agents:j.inbound_agents??j.inbound_agent_id,termination_uri:j.termination_uri}))})'

echo "8. save to .env"
for kv in "TWILIO_SIP_TRUNK_SID=$TK" "TWILIO_SIP_CREDENTIAL_LIST_SID=$CL" "TWILIO_SIP_DOMAIN=$DOMAIN" "TWILIO_SIP_USERNAME=$USERNAME" "TWILIO_SIP_PASSWORD=$PASSWORD"; do
  echo "$kv" >> .env; grep -q "^${kv%%=*}=" .env.example || echo "${kv%%=*}=" >> .env.example
done

echo; echo "read back: Twilio number (voice on trunk, sms_url still n8n?)"
curl -sf -u "$SID:$TOK" "https://api.twilio.com/2010-04-01/Accounts/$SID/IncomingPhoneNumbers/$PN.json" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const n=JSON.parse(d);console.log("   "+JSON.stringify({trunk_sid:n.trunk_sid,voice_url:n.voice_url,sms_url:n.sms_url,mms:n.capabilities.mms}))})'
echo "read back: Retell numbers"
curl -sf "https://api.retellai.com/list-phone-numbers" -H "Authorization: Bearer $RKEY" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{console.log("   "+JSON.stringify(JSON.parse(d).map(p=>({number:p.phone_number,type:p.phone_number_type,inbound:p.inbound_agents??p.inbound_agent_id}))))})'
echo; echo "Done. Call $NUMBER and you should hear the opener."
