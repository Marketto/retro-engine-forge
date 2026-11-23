#!/bin/bash
# SPDX-License-Identifier: GPL-3.0-or-later
# build-commit.sh <commit>: builds that commit WITHOUT the test driver, for manual play.
# Output: $WORK/play/<hash>/app and play.sh (own saves, never the user's).
set -u
. "$(dirname "$0")/forge-lib.sh"
[ $# -eq 1 ] || { sed -n 3,4p "$0"; exit 1; }
C=$(git -C "$UP" rev-parse --verify "$1^{commit}") || exit 1
SHORT=$(git -C "$UP" rev-parse --short=8 "$C")
WT=$WORK/wt-play
BUILDDIR=$WORK/build-play
DEST=$WORK/play/$SHORT
warn_stale_main
prepare_wt "$WT" || exit 1
checkout_at "$WT" "$BUILDDIR" "$C" && build "$WT" "$BUILDDIR" "$C" || exit 1
mkdir -p "$DEST/saves"
cp "$BUILDDIR/${BINARY:?BINARY missing in forge.conf}" "$DEST/app"
{
	echo '#!/bin/bash'
	echo "# $(git -C "$UP" log -1 --oneline "$C")"
	echo 'cd "$(dirname "$0")"'
	echo "BIN=\$PWD/app GAME='$GAME' CASE_DIR=\$PWD"
	echo "$RUN 2>&1 | tee last.log"
} > "$DEST/play.sh"
chmod +x "$DEST/play.sh"
echo "ready: $DEST/play.sh"
