#!/bin/bash
# SPDX-License-Identifier: GPL-3.0-or-later
# test-commits.sh <branch|range|commit> [case...]
# Tests commits in game, before and after: builds each commit and its parent with the test driver
# ($TEST_BRANCH cherry-picked), runs the cases and checks the "#@ before|after" lines of each case.
# Without case names: the cases whose "#@ subject <regex>" matches the commit title.
#   test-commits.sh myengine-fixes-1          # every commit of main..myengine-fixes-1
#   test-commits.sh 1a2b3c4d scroll-left      # one commit, one case
# Results: $OUT/<hash>/{before,after}/<case>/ and $OUT/summary.txt.
# A case with "#@ manual" is NOT tested until its manual part has been played (rule R17).
set -u
. "$(dirname "$0")/forge-lib.sh"
WT=$WORK/wt-test
BUILDDIR=$WORK/build-test
DRIVER=$(git -C "$UP" rev-parse --short=8 "$TEST_BRANCH" 2>/dev/null) || { echo "branch $TEST_BRANCH missing" >&2; exit 1; }
BIN=$WORK/bin/$DRIVER
[ $# -ge 1 ] || { sed -n 3,10p "$0"; exit 1; }
SEL=$1; shift
if git -C "$UP" show-ref -q --verify "refs/heads/$SEL"; then COMMITS=$(git -C "$UP" rev-list --reverse "$MAIN_BRANCH..$SEL")
elif [[ $SEL == *..* ]]; then COMMITS=$(git -C "$UP" rev-list --reverse "$SEL")
else COMMITS=$(git -C "$UP" rev-parse --verify "$SEL^{commit}") || exit 1; fi
[ -n "$COMMITS" ] || { echo "no commits in $SEL"; exit 1; }
warn_stale_main
prepare_wt "$WT" || exit 1

# binary <commit>: the binary of that commit with the driver (cached per driver version)
binary() {
	local c=$1
	if [ ! -x "$BIN/$c/app" ]; then
		echo "  build $(git -C "$UP" log -1 --format='%h %s' "$c")" >&2
		checkout_at "$WT" "$BUILDDIR" "$c" test && build "$WT" "$BUILDDIR" "$c" || return 1
		mkdir -p "$BIN/$c" && cp "$BUILDDIR/${BINARY:?BINARY missing in forge.conf}" "$BIN/$c/app"
	fi
	echo "$BIN/$c/app"
}

# check <case> <before|after> <dir>: grep / nogrep (case-insensitive ERE on run.log), exit <code>, sh <command>
check() {
	local case=$1 side=$2 dir=$3 res=OK line kind arg code
	code=$(sed -n 's/^exit=//p' "$dir/result.txt")
	while IFS= read -r line; do
		kind=${line%% *}; arg=${line#* }
		case $kind in
		grep) grep -Eiq -- "$arg" "$dir/run.log" || { res=FAILED; echo "    $side: missing /$arg/"; } ;;
		nogrep) ! grep -Eiq -- "$arg" "$dir/run.log" || { res=FAILED; echo "    $side: found /$arg/"; } ;;
		exit) [ "$code" = "$arg" ] || { res=FAILED; echo "    $side: exit $code instead of $arg"; } ;;
		sh) ( cd "$dir" && bash -c "$arg" ) >> "$dir/sh.out" 2>&1 || { res=FAILED; echo "    $side: sh failed: $arg"; } ;;
		esac
	done < <(sed -n "s/^#@ $side //p" "$case")
	echo "$res" > "$dir/check.txt"
}

SUM=$OUT/summary.txt
mkdir -p "$OUT"
echo "# $(date '+%Y-%m-%d %H:%M') test-commits.sh $SEL $*" >> "$SUM"
printf '%-9s %-40s %-26s %-7s %-7s %s\n' commit title case before after result | tee -a "$SUM"
for c in $COMMITS; do
	short=$(git -C "$UP" rev-parse --short=8 "$c")
	title=$(git -C "$UP" log -1 --format=%s "$c" | sed -E 's/^DRAFT //; s/^[A-Za-z0-9_-]+: ([A-Za-z0-9_-]+: )?//')
	cases=()
	if [ $# -gt 0 ]; then
		for n in "$@"; do cases+=("$CASES/${n%.txt}.txt"); done
	else
		for f in "$CASES"/*.txt; do
			re=$(sed -n 's/^#@ subject //p' "$f")
			[ -n "$re" ] && echo "$title" | grep -Eiq -- "$re" && cases+=("$f")
		done
	fi
	if [ ${#cases[@]} -eq 0 ]; then
		printf '%-9s %-40.40s %-26s %-7s %-7s %s\n' "$short" "$title" - - - "NO CASE: not tested" | tee -a "$SUM"
		continue
	fi
	after=$(binary "$c") || { echo "$short: build failed" | tee -a "$SUM"; continue; }
	before=$(binary "$(git -C "$UP" rev-parse "$c~1")") || { echo "$short~1: build failed" | tee -a "$SUM"; continue; }
	for case in "${cases[@]}"; do
		name=$(basename "$case" .txt)
		[ -f "$case" ] || { echo "case $name missing"; continue; }
		to=$(sed -n 's/^#@ timeout //p' "$case")
		for side in before after; do
			b=$before; [ $side = after ] && b=$after
			dir="${OUT:?}/${short:?}/${side:?}/${name:?}"
			rm -rf "$dir"
			"$FORGE_TOOLS/run-case.sh" "$case" "$dir" "$b" "${to:-240}"
			check "$case" $side "$dir"
		done
		rb=$(cat "$OUT/$short/before/$name/check.txt"); ra=$(cat "$OUT/$short/after/$name/check.txt")
		res=FAILED; [ "$rb $ra" = "OK OK" ] && res=OK
		grep -q '^#@ manual' "$case" && res="$res + MANUAL PART PENDING"
		printf '%-9s %-40.40s %-26s %-7s %-7s %s\n' "$short" "$title" "$name" "$rb" "$ra" "$res" | tee -a "$SUM"
	done
done
exit 0
