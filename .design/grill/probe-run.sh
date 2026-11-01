#!/usr/bin/env bash
# probe-run.sh - measure a page for layout defects at the widths we care about, and report every one of them.
#
#   ./.design/grill/probe-run.sh .design/grill/round-4.html
#   ./.design/grill/probe-run.sh .design/grill/round-4.html 1240 375 320
#
# What it measures: .design/grill/probe.js runs inside the page (firefox --screenshot does execute page JS) and paints a
# fixed banner whose BACKGROUND COLOUR is the verdict, so reading one pixel is a gate:
#   #0a6b3d (10,107,61) = clean     #b00020 (176,0,32) = defects
# The vision model is used only to transcribe the banner lines - never to judge layout. Both local models scored a
# deliberately overlapping/clipped/faint text block as "none" for the question "any text overlapping, cut off, clipped
# or unreadable?" while being able to read that text out loud. So judgement from a screenshot is worthless here;
# measurement in the browser plus transcription is not.
#
# Why the shape of this loop is the way it is (each clause is paying for a measured failure):
#   fresh profile per run   - a reused profile goes "already in use"; firefox then exits 0 and writes NO PNG, silently
#   capture and dump stderr - the first version sent it to /dev/null and I debugged a missing screenshot blind
#   absolute out path       - firefox resolves a relative --screenshot against its own notion of cwd
#   no set -e               - one bad width must not cancel the rest of the report; collect rc and keep going
#   page copy next to page  - the previews load PT Serif by relative path into node_modules; a copy in /tmp would
#                             measure Georgia metrics, which measures the wrong thing
set -u
set -o pipefail

page="${1:?usage: probe-run.sh <page.html> [width ...]}"
shift
widths=("$@"); [ ${#widths[@]} -eq 0 ] && widths=(1240 375 320)

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
page="$(readlink -f "$page")"
[ -f "$page" ] || { echo "no such page: $page" >&2; exit 2; }
dir="$(dirname "$page")"; base="$(basename "$page" .html)"
probed="$dir/.probed-$base.html"
probejs="$dir/probe.js"
pids=()
cleanup() { for p in "${pids[@]:-}"; do rm -rf "$p"; done; rm -f "$probed"; }
trap cleanup EXIT

python3 - "$page" "$probed" <<'PY'
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src).read()
tag = '<script src="probe.js"></script>'
s = s.replace('</body>', tag + '</body>') if '</body>' in s else s + tag
open(dst, 'w').write(s)
PY

fail=0
for w in "${widths[@]}"; do
  prof="$(mktemp -d /tmp/ffprof.XXXXXX)"; pids+=("$prof")
  out="$dir/.probe-shot-$w.png"
  rm -f "$out"
  timeout 120 firefox --headless --no-remote --profile "$prof" \
    --window-size="${w},4200" --screenshot "$out" "file://$probed" >"$prof/log" 2>&1
  rc=$?
  if [ ! -s "$out" ]; then
    echo "${w}px: NO SCREENSHOT (firefox rc=$rc) - stderr below, not swallowed"
    sed 's/^/    /' "$prof/log" | tail -20
    fail=1
    continue
  fi
  # one pixel = the verdict
  verdict="$(node -e '
    const sharp = require("'"$root"'/node_modules/sharp");
    sharp(process.argv[1]).extract({left:6,top:6,width:1,height:1}).raw()
      .toBuffer({resolveWithObject:true}).then(({data})=>{
        const [r,g,b]=[...data];
        console.log((r===0x0a&&g===0x6b&&b===0x3d)?"CLEAN":
                    (r===0xb0&&g===0x00&&b===0x20)?"DEFECTS":"NO BANNER (probe.js did not run) rgb="+[r,g,b]);
      }).catch(e=>console.log("PIXEL READ FAILED "+e.message))' "$out")"
  bytes=$(stat -c%s "$out")
  echo "${w}px: $verdict  (shot ${bytes}B)"
  if [ "$verdict" = "DEFECTS" ]; then
    fail=1
    node -e '
      const sharp=require("'"$root"'/node_modules/sharp");
      sharp(process.argv[1]).extract({left:0,top:0,width:Math.min(parseInt(process.argv[3],10),760),height:520})
        .resize({width:1100}).jpeg({quality:92}).toFile(process.argv[2]).catch(()=>{})' "$out" "$dir/.probe-banner-$w.jpg" "$w"
    if [ -f "$dir/.probe-banner-$w.jpg" ]; then
      python3 "$root/.design/vision-ask.py" "$dir/.probe-banner-$w.jpg" \
        "Transcribe the banner text exactly, every line." qwen3-vl-4b-instruct 2>/dev/null | tail -24
    fi
  fi
  rm -f "$dir/.probe-banner-$w.jpg"
done

# prove the probe can still fail: a page with a known defect must come back DEFECTS, or this whole harness is decoration
if [ "$fail" -eq 0 ] && [ "${SKIP_CONTROL:-0}" != "1" ]; then
  ctl="$dir/.probe-control-$base.html"
  python3 - "$page" "$ctl" <<'PY'
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src).read()
ctl = ('<div style="position:absolute;left:40px;top:900px;width:620px;background:#fff;padding:8px;z-index:9999">'
       '<div style="width:46px;overflow:hidden;white-space:nowrap;font-size:15px;color:#2b2b2b">'
       'this text is clipped to 46 pixels and nobody would notice</div></div>'
       '<script src="probe.js"></script>')
s = s.replace('</body>', ctl + '</body>')
open(dst, 'w').write(s)
PY
  prof="$(mktemp -d /tmp/ffprof.XXXXXX)"; pids+=("$prof")
  cout="$dir/.probe-control-shot.png"
  timeout 120 firefox --headless --no-remote --profile "$prof" --window-size=1240,4200 \
    --screenshot "$cout" "file://$ctl" >"$prof/log" 2>&1
  cv="$(node -e '
    const sharp=require("'"$root"'/node_modules/sharp");
    sharp(process.argv[1]).extract({left:6,top:6,width:1,height:1}).raw()
      .toBuffer({resolveWithObject:true}).then(({data})=>{
        const [r,g,b]=[...data];
        console.log((r===0x0a&&g===0x6b&&b===0x3d)?"CLEAN":(r===0xb0&&g===0x00&&b===0x20)?"DEFECTS":"NO BANNER "+[r,g,b]);
      }).catch(e=>console.log("PIXEL READ FAILED "+e.message))' "$cout" 2>/dev/null)"
  echo "control (a page with one clipped block, must read DEFECTS): $cv"
  [ "$cv" = "DEFECTS" ] || { echo "  -> probe is not falsifiable; its CLEAN means nothing"; fail=1; }
  rm -f "$ctl" "$cout"
fi

exit $fail
