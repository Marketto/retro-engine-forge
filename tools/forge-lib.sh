# SPDX-License-Identifier: GPL-3.0-or-later
# Shared functions for the shell tools (source with ".").
# Reads forge.conf from $FORGE_CONF or the current folder.
FORGE_TOOLS=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
CONF=${FORGE_CONF:-$PWD/forge.conf}
[ -f "$CONF" ] || { echo "forge.conf not found (run: retro-engine-forge init, or set FORGE_CONF)" >&2; exit 1; }
CONF_DIR=$(cd "$(dirname "$CONF")" && pwd)
. "$CONF"
abs() { case $1 in /*) echo "$1" ;; *) echo "$CONF_DIR/$1" ;; esac; }
UP=$(abs "${UPSTREAM:?UPSTREAM missing in forge.conf}")
MAIN_BRANCH=${MAIN_BRANCH:-master}
WORK=$(abs "${WORK:-../forge-work}")
CASES=$(abs "${CASES:-cases}")
OUT=$(abs "${OUT:-.forge/tests}")
GAME=$(abs "${GAME:?GAME missing in forge.conf}")
JOBS=${JOBS:-4}

# warn_stale_main: the upstream check (R18) needs the main branch as it is on the project's remote
warn_stale_main() {
	local remote; remote=$(git -C "$UP" config "branch.$MAIN_BRANCH.remote" || echo origin)
	git -C "$UP" fetch -q "$remote" "$MAIN_BRANCH" 2>/dev/null || { echo "note: could not fetch $remote/$MAIN_BRANCH" >&2; return 0; }
	[ "$(git -C "$UP" rev-parse "$MAIN_BRANCH")" = "$(git -C "$UP" rev-parse FETCH_HEAD)" ] ||
		echo "note: local $MAIN_BRANCH differs from $remote/$MAIN_BRANCH: update it before checking whether a bug is still upstream" >&2
}

# prepare_wt <dir>: (worktree removed on exit unless KEEP_WT=1) detached worktree of $UP, created when missing
prepare_wt() {
	local wt=$1
	if [ ! -e "$wt/.git" ]; then
		mkdir -p "$(dirname "$wt")"
		git -C "$UP" worktree add -q --detach "$wt" "$MAIN_BRANCH" >/dev/null 2>&1 ||
			{ echo "worktree $wt not created" >&2; return 1; }
		# old timestamps: incremental builds only recompile what checkout_at touches
		find "$wt" -path "$wt/.git" -prune -o -type f -print0 | xargs -0 touch -h -t 200001010000
	fi
	[ -n "${KEEP_WT:-}" ] || trap 'git -C "$UP" worktree remove --force "'"$wt"'" 2>/dev/null' EXIT
}

# checkout_at <wt> <build> <commit> [test]: put <commit> in the worktree (+ the driver commit with "test")
checkout_at() {
	local wt=$1 build=$2 c=$3 test=${4:-} last
	git -C "$wt" reset -q --hard
	git -C "$wt" clean -qfd -- "${SCOPE:-.}"
	git -C "$wt" checkout -q --detach -f "$c" || return 1
	if [ -n "$test" ]; then
		git -C "$wt" cherry-pick -n "$TEST_BRANCH" >/dev/null ||
			{ echo "cherry-pick of $TEST_BRANCH on $c conflicts" >&2; return 1; }
	fi
	last=$(cat "$build/.last" 2>/dev/null)
	if [ -n "$last" ] && git -C "$wt" cat-file -e "$last^{commit}" 2>/dev/null; then
		{ git -C "$wt" diff --name-only "$last" "$c"
		  [ -n "$test" ] && git -C "$wt" diff --name-only "$TEST_BRANCH~1" "$TEST_BRANCH"; } | sort -u |
			while read -r f; do [ -e "$wt/$f" ] && touch "$wt/$f"; done
	else
		find "$wt" -path "$wt/.git" -prune -o -type f -print0 | xargs -0 touch
	fi
}

# build <wt> <build> <commit>: configure once ($CONFIGURE), then $BUILD
build() {
	local SRC=$1 BUILD_DIR=$2 c=$3
	mkdir -p "$BUILD_DIR"
	# reconfigure when the configure command changes
	local key; key=$(printf '%s|%s' "$CONFIGURE" "$SRC" | cksum | cut -d' ' -f1)
	if [ -n "${CONFIGURE:-}" ] && [ "$(cat "$BUILD_DIR/.configured" 2>/dev/null)" != "$key" ]; then
		( cd "$BUILD_DIR" && eval "$CONFIGURE" > configure.out 2>&1 ) ||
			{ echo "configure failed ($BUILD_DIR/configure.out)" >&2; return 1; }
		echo "$key" > "$BUILD_DIR/.configured"
	fi
	( cd "$BUILD_DIR" && eval "${BUILD:?BUILD missing in forge.conf}" > make.out 2>&1 ) ||
		{ echo "build failed ($BUILD_DIR/make.out)" >&2; tail -20 "$BUILD_DIR/make.out" >&2; rm -f "$BUILD_DIR/.last"; return 1; }
	echo "$c" > "$BUILD_DIR/.last"
}
