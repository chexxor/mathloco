$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$session.Cookies.Add((New-Object System.Net.Cookie("MEETUP_BROWSER_ID", "id=a99e1113-60d3-48cb-9f4a-073890307cbe", "/", "www.meetup.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("MEETUP_TRACK", "`"`"", "/", "www.meetup.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("OptanonConsent", "isGpcEnabled=1&datestamp=Mon+Nov+25+2024+20:25:13+GMT-0600+(Central+Standard+Time)&version=202306.1.0&browserGpcFlag=1&isIABGlobal=false&hosts=&consentId=f6933ed1-03dc-4369-8fec-5b50fd45907e&interactionCount=1&landingPath=NotLandingPage&groups=C0005:1,C0002:1,C0001:1,C0004:0,C0003:1&AwaitingReconsent=false", "/", "www.meetup.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("_ga_NP82XMKW0P", "GS1.1.1732587913.2.0.1732587931.0.0.0", "/", "www.meetup.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("_ga", "GA1.1.2056610961.1732429262", "/", "www.meetup.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("MEETUP_MEMBER", "id=0&status=1&timestamp=1732429327&bs=0&tz=US/Eastern&zip=&country=us&city=&state=&lat=0.0&lon=0.0&ql=false&s=c0d3de25986f1bddc8fd5e165518c64698b5583e&scope=ALL", "/", "www.meetup.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("MEETUP_AFFIL", "affil=meetup", "/", "www.meetup.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("MEETUP_CSRF", "2b2d260b-1a61-4c23-bb17-2f5a3341272a", "/", "www.meetup.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("SIFT_SESSION_ID", "8d083eac-c147-4753-a85c-0b46c0f44272", "/", "www.meetup.com")))
$response = Invoke-WebRequest -UseBasicParsing -Uri "https://www.meetup.com/gql2" `
-Method POST `
-WebSession $session `
-UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0" `
-Headers @{
"Accept" = "*/*"
  "Accept-Language" = "en-US"
  "Accept-Encoding" = "gzip, deflate, br, zstd"
  "Referer" = "https://www.meetup.com/minneapolis-mathematics-book-club/events/304601333/"
  "apollographql-client-name" = "nextjs-web"
  "x-meetup-view-id" = "8966af4c-91a0-474a-9f79-6a08889059db"
  "Origin" = "https://www.meetup.com"
  "DNT" = "1"
  "Sec-GPC" = "1"
  "Sec-Fetch-Dest" = "empty"
  "Sec-Fetch-Mode" = "cors"
  "Sec-Fetch-Site" = "same-origin"
  "Priority" = "u=4"
  "Pragma" = "no-cache"
  "Cache-Control" = "no-cache"
  "TE" = "trailers"
} `
-ContentType "application/json" `
-Body "{`"operationName`":`"getEventByIdForAttendees`",`"variables`":{`"eventId`":`"304601333`",`"first`":6,`"filter`":{`"rsvpStatus`":[`"YES`",`"ATTENDED`"]},`"sort`":null},`"extensions`":{`"persistedQuery`":{`"version`":1,`"sha256Hash`":`"f78e61dbd9610ab27d429c287ad2f09bfd65244de8622c1c3d64349d8d07c713`"}}}"


# Extract and save the Content property
$content = $response.Content | ConvertFrom-Json

# Pretty-print the JSON content with reduced indentation
$json = $content | ConvertTo-Json -Depth 10
# Replace default 2-space indentation with a single space
$reducedIndentJson = $json -replace "  ", " "

# Output the reduced-indentation JSON
Write-Output $reducedIndentJson