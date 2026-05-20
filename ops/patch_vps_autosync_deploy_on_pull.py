from pathlib import Path

p = Path('/root/git_autosync_v2.sh')
text = p.read_text()
backup = Path('/root/git_autosync_v2.sh.bak_20260520_deploy_on_pull')
backup.write_text(text)

func = '''
deploy_after_fast_forward() {
  local new_head="$1"
  local lock_dir="/tmp/cv-git-sync-deploy.lock"
  local deploy_log="$REPO/logs/autosync-deploy.log"
  mkdir -p "$REPO/logs"
  if ! mkdir "$lock_dir" 2>/dev/null; then
    alert "deploy_locked" "Deploy already running after fast-forward; skipped duplicate deploy for HEAD=${new_head}."
    return 1
  fi
  trap 'rmdir "$lock_dir" 2>/dev/null || true' RETURN
  echo "[$(ts)] deploy start after fast-forward HEAD=${new_head}" | tee -a "$deploy_log"
  if (
    cd "$REPO" && \
    pnpm install --frozen-lockfile && \
    pnpm build && \
    ./deploy_work_to_prod.sh
  ) >>"$deploy_log" 2>&1; then
    echo "[$(ts)] deploy success HEAD=${new_head}" | tee -a "$deploy_log"
    clear_alert "deploy_fail"
    return 0
  fi
  local code=$?
  echo "[$(ts)] deploy failed HEAD=${new_head} exit=${code}; see ${deploy_log}" | tee -a "$deploy_log"
  alert "deploy_fail" "Fast-forwarded to HEAD=${new_head}, but production deploy failed. Check ${deploy_log}."
  return "$code"
}
'''

if 'deploy_after_fast_forward()' not in text:
    marker = '''repo_in_special_state() {
  [ -d "$REPO/.git/rebase-merge" ] || \\
  [ -d "$REPO/.git/rebase-apply" ] || \\
  [ -f "$REPO/.git/MERGE_HEAD" ]    || \\
  [ -f "$REPO/.git/CHERRY_PICK_HEAD" ]
}
'''
    if marker not in text:
        raise SystemExit('marker not found')
    text = text.replace(marker, marker + func + '\n')

old = '''  if [ "$BEHIND" -gt 0 ]; then
    if git merge --ff-only "origin/$BRANCH" --quiet 2>/dev/null; then
      echo "[$(ts)] fast-forwarded $BEHIND commit(s) from origin"
      clear_alert "diverged"
    else
      alert "ff_fail" "Fast-forward pull failed despite no local changes. Investigate: 'git status' on VPS."
    fi
    continue
  fi
'''
new = '''  if [ "$BEHIND" -gt 0 ]; then
    if git merge --ff-only "origin/$BRANCH" --quiet 2>/dev/null; then
      NEW_HEAD=$(git rev-parse --short HEAD)
      echo "[$(ts)] fast-forwarded $BEHIND commit(s) from origin, HEAD=$NEW_HEAD"
      clear_alert "diverged"
      deploy_after_fast_forward "$NEW_HEAD" || true
    else
      alert "ff_fail" "Fast-forward pull failed despite no local changes. Investigate: 'git status' on VPS."
    fi
    continue
  fi
'''
if old in text:
    text = text.replace(old, new)
elif 'deploy_after_fast_forward "$NEW_HEAD"' not in text:
    raise SystemExit('fast-forward block marker not found and deploy call not present')

p.write_text(text)
print('patched /root/git_autosync_v2.sh with deploy_after_fast_forward')
