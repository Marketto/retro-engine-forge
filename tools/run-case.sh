#!/bin/bash
# SPDX-License-Identifier: GPL-3.0-or-later
# run-case.sh <case.txt> <out-dir> <binary> [timeout]
# Runs the game ($RUN of forge.conf) under the test driver. Comment and "#@" lines are stripped; the rest of
# the case is the driver script. Output: <out-dir>/run.log (stdout+stderr), <out-dir>/result.txt (exit code).
set -u
. "$(dirname "$0")/forge-lib.sh"
CASE=$1; CASE_DIR=$2; BIN=$3; T=${4:-240}
mkdir -p "$CASE_DIR/saves"
# RUN_FILES: files copied into the case folder first (e.g. a test config that disables startup dialogs)
for f in ${RUN_FILES:-}; do cp "$(abs "$f")" "$CASE_DIR/" || exit 1; done
grep -v -e '^#' -e '^[[:space:]]*$' "$CASE" | sed -e "s|^shot |shot $CASE_DIR/|" > "$CASE_DIR/script.txt"
export SDL_AUDIODRIVER=${SDL_AUDIODRIVER:-dummy}
# no window: SDL's dummy video driver (screenshots still work); set SDL_VIDEODRIVER/DISPLAY to override
export SDL_VIDEODRIVER=${SDL_VIDEODRIVER:-dummy}
export "${DRIVER_ENV:?DRIVER_ENV missing in forge.conf}=$CASE_DIR/script.txt"
# "#@ env NAME=value" lines of the case (e.g. MallocPreScribble=1 to expose uninitialized members)
while IFS= read -r v; do [ -n "$v" ] && export "$v"; done < <(sed -n 's/^#@ env //p' "$CASE")
if command -v timeout >/dev/null; then TO="timeout -s KILL $T"; else TO="perl -e 'alarm(shift);exec(@ARGV)' $T"; fi
( cd "$CASE_DIR" && eval "$TO ${RUN:?RUN missing in forge.conf}" > run.log 2>&1 )
echo "exit=$?" > "$CASE_DIR/result.txt"
