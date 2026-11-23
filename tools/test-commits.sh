#!/bin/bash
# SPDX-License-Identifier: GPL-3.0-or-later
# test-commits.sh <branch|range|commit> [case...]
# Tests commits in game, before and after: builds each commit and its parent with the test driver
# ($TEST_BRANCH cherry-picked), runs the cases and checks the "#@ before|after" lines of each case.
# Without case names: the cases whose "#@ subject <regex>" matches the commit title.
#   test-commits.sh myengine-fixes-1          # every commit of main..myengine-fixes-1
#   test-commits.sh 1a2b3c4d scroll-left      # one commit, one case
# Cases with "#@ regression" run on EVERY commit and must give the same result and driver state before and after (R32).
# Results: $OUT/<hash>/{before,after}/<case>/, $OUT/<hash>/result.txt and $OUT/summary.txt.
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

# check <case> <before|after> <dir>: lines "#@ <side> ..." and "#@ check ..." (both sides): grep / nogrep (case-insensitive ERE on run.log), exit <code>, sh <command>
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
	done < <(sed -n -e "s/^#@ $side //p" -e "s/^#@ check //p" "$case")
	echo "$res" > "$dir/check.txt"
}

# run_case <case> <short> <before-bin> <after-bin>: both sides, results in $OUT/<short>/{before,after}/<case>
run_both() {
	local case=$1 short=$2 name side b dir to
	name=$(basename "$case" .txt); to=$(sed -n 's/^#@ timeout //p' "$case")
	for side in before after; do
		b=$3; [ $side = after ] && b=$4
		dir="${OUT:?}/${short:?}/${side:?}/${name:?}"
		rm -rf "$dir"
		"$FORGE_TOOLS/run-case.sh" "$case" "$dir" "$b" "${to:-240}"
		check "$case" $side "$dir"
	done
}

# same_state <short> <name>: the driver's state lines ($STATE_LINES) are identical before and after, once the
# run-dependent parts ($STATE_IGNORE, a sed -E expression: poll counts, timings) are removed
state_of() { grep -aE "${STATE_LINES:-^AutoTest:}" "$1" | sed -E "${STATE_IGNORE:-s/[0-9]+ ?(polls?|ms|frames?)//g}"; }
same_state() {
	diff -q <(state_of "$OUT/$1/before/$2/run.log") <(state_of "$OUT/$1/after/$2/run.log") >/dev/null
}

SUM=$OUT/summary.txt
mkdir -p "$OUT"
REGRESSIONS=()
for f in "$CASES"/*.txt; do grep -q '^#@ regression' "$f" && REGRESSIONS+=("$f"); done
echo "# $(date '+%Y-%m-%d %H:%M') test-commits.sh $SEL $* (${#REGRESSIONS[@]} regression cases)" >> "$SUM"
printf '%-9s %-40s %-26s %-7s %-7s %s\n' commit title case before after result | tee -a "$SUM"
for c in $COMMITS; do
	short=$(git -C "$UP" rev-parse --short=8 "$c")
	title=$(git -C "$UP" log -1 --format=%s "$c" | sed -E 's/^DRAFT //; s/^[A-Za-z0-9_-]+: ([A-Za-z0-9_-]+: )?//')
	cases=()
	if [ $# -gt 0 ]; then
		for n in "$@"; do cases+=("$CASES/${n%.txt}.txt"); done
	else
		for f in "$CASES"/*.txt; do
			grep -q '^#@ regression' "$f" && continue
			re=$(sed -n 's/^#@ subject //p' "$f")
			[ -n "$re" ] && echo "$title" | grep -Eiq -- "$re" && cases+=("$f")
		done
	fi
	mkdir -p "$OUT/$short"
	: > "$OUT/$short/result.txt"
	if [ ${#cases[@]} -eq 0 ]; then
		printf '%-9s %-40.40s %-26s %-7s %-7s %s\n' "$short" "$title" - - - "NO CASE: not tested" | tee -a "$SUM"
		echo "fix - - - NO-CASE" >> "$OUT/$short/result.txt"
		continue
	fi
	after=$(binary "$c") || { echo "$short: build failed" | tee -a "$SUM"; continue; }
	before=$(binary "$(git -C "$UP" rev-parse "$c~1")") || { echo "$short~1: build failed" | tee -a "$SUM"; continue; }
	# the fix: must fail its "before" checks on the parent and pass its "after" checks on the commit
	for case in "${cases[@]}"; do
		name=$(basename "$case" .txt)
		[ -f "$case" ] || { echo "case $name missing"; continue; }
		run_both "$case" "$short" "$before" "$after"
		rb=$(cat "$OUT/$short/before/$name/check.txt"); ra=$(cat "$OUT/$short/after/$name/check.txt")
		res=FAILED; [ "$rb $ra" = "OK OK" ] && res=OK
		grep -q '^#@ manual' "$case" && res="$res+MANUAL-PENDING"
		echo "fix $name $rb $ra $res" >> "$OUT/$short/result.txt"
		printf '%-9s %-40.40s %-26s %-7s %-7s %s\n' "$short" "$title" "$name" "$rb" "$ra" "$res" | tee -a "$SUM"
	done
	# regressions (R32): same checks and same driver state before and after
	for case in "${REGRESSIONS[@]}"; do
		name=$(basename "$case" .txt)
		run_both "$case" "$short" "$before" "$after"
		rb=$(cat "$OUT/$short/before/$name/check.txt"); ra=$(cat "$OUT/$short/after/$name/check.txt")
		res=OK
		if [ "$rb" != OK ] && [ "$ra" != OK ]; then res=BROKEN-CASE
		elif [ "$ra" != OK ]; then res=REGRESSION
		elif [ "$rb" != OK ]; then res=CHANGED; fi
		[ $res = OK ] && ! grep -q '^#@ nocompare' "$case" && ! same_state "$short" "$name" && res=CHANGED
		echo "regression $name $rb $ra $res" >> "$OUT/$short/result.txt"
		printf '%-9s %-40.40s %-26s %-7s %-7s %s\n' "$short" "$title" "[r] $name" "$rb" "$ra" "$res" | tee -a "$SUM"
	done
	[ ${#REGRESSIONS[@]} -gt 0 ] || echo "regression - - - NONE" >> "$OUT/$short/result.txt"
done
echo "CHANGED = checks or driver state differ before/after: explain it with the assembly or treat it as a regression (R32). BROKEN-CASE = fails on both sides: fix the case." | tee -a "$SUM"
exit 0
