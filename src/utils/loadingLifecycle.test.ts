import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLoadingState,
  beginLoadingInitialization,
  advanceMilestone,
  handleAssetResult,
  handleInitError,
  handleLoadingTimeout,
  canDismissOverlay,
  dismissLoadingOverlay,
  shouldSkipLoadingIntro,
  isStaticHostingEnvironment,
} from './loadingLifecycle';

test('beginLoadingInitialization enforces single initialization', () => {
  const initial = createLoadingState(1000);
  const first = beginLoadingInitialization(initial);
  assert.equal(first.accepted, true);
  assert.equal(first.state.initialized, true);

  const second = beginLoadingInitialization(first.state);
  assert.equal(second.accepted, false);
  assert.equal(second.state.progress, first.state.progress);
});

test('milestones advance progress monotonically up to 100%', () => {
  let state = createLoadingState(0);
  state = advanceMilestone(state, 'dom');
  assert.equal(state.progress, 30);
  assert.equal(canDismissOverlay(state), false);

  state = advanceMilestone(state, 'bundle');
  assert.equal(state.progress, 65);
  assert.equal(canDismissOverlay(state), false);

  state = advanceMilestone(state, 'mounted');
  assert.equal(state.progress, 90);
  assert.equal(canDismissOverlay(state), true);

  state = advanceMilestone(state, 'ready');
  assert.equal(state.progress, 100);
  assert.equal(state.phase, 'ready');
});

test('nonessential asset failures do not block loading or trigger error state', () => {
  let state = createLoadingState(0);
  state = advanceMilestone(state, 'mounted');
  state = handleAssetResult(state, { essential: false, ok: false });
  assert.equal(state.phase, 'loading');
  assert.equal(state.optionalFailedCount, 1);
  assert.equal(canDismissOverlay(state), true);

  state = advanceMilestone(state, 'ready');
  assert.equal(state.phase, 'ready');
  assert.equal(state.progress, 100);
});

test('essential asset failure enters error phase and refuses dismissal', () => {
  let state = createLoadingState(0);
  state = handleAssetResult(state, {
    essential: true,
    ok: false,
    errorLabel: 'Bundle missing',
  });
  assert.equal(state.phase, 'error');
  assert.equal(state.errorMessage, 'Bundle missing');
  assert.equal(canDismissOverlay(state), false);

  const dismissedAttempt = dismissLoadingOverlay(state);
  assert.equal(dismissedAttempt.phase, 'error');
});

test('timeout never hides overlay when app has not mounted', () => {
  let state = createLoadingState(0);
  state = advanceMilestone(state, 'dom');
  const timedOut = handleLoadingTimeout(state);
  assert.equal(timedOut.phase, 'error');
  assert.ok(timedOut.errorMessage);
  assert.equal(canDismissOverlay(timedOut), false);
});

test('timeout completes cleanly when app already mounted', () => {
  let state = createLoadingState(0);
  state = advanceMilestone(state, 'mounted');
  const timedOut = handleLoadingTimeout(state);
  assert.equal(timedOut.phase, 'ready');
  assert.equal(timedOut.progress, 100);
  assert.equal(canDismissOverlay(timedOut), true);
});

test('init error clears if app subsequently mounts cleanly', () => {
  let state = createLoadingState(0);
  state = handleInitError(state, 'Temporary warning');
  assert.equal(state.phase, 'error');
  state = advanceMilestone(state, 'mounted');
  assert.equal(state.phase, 'loading');
  assert.equal(state.errorMessage, null);
  state = dismissLoadingOverlay(state);
  assert.equal(state.phase, 'dismissed');
});

test('shouldSkipLoadingIntro and isStaticHostingEnvironment detect flags cleanly', () => {
  assert.equal(shouldSkipLoadingIntro('?autostart=1'), true);
  assert.equal(shouldSkipLoadingIntro('?foo=bar&autostart=true'), true);
  assert.equal(shouldSkipLoadingIntro('?foo=bar'), false);
  assert.equal(shouldSkipLoadingIntro(''), false);

  assert.equal(isStaticHostingEnvironment('zorkal3ab-netizen.github.io'), true);
  assert.equal(isStaticHostingEnvironment('localhost'), false);
  assert.equal(isStaticHostingEnvironment('ais-dev-example.run.app'), false);
});
