import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveOnboardingRoute, type OnboardingState } from '../resolveOnboardingRoute';

const complete: OnboardingState = {
  hasAcceptedTerms: true,
  hasDisplayName: true,
  hasMusicProfile: true,
  hasPhotos: true,
  hasBasicInfo: true,
};

describe('resolveOnboardingRoute', () => {
  it('sends a brand new account to Terms first', () => {
    assert.equal(
      resolveOnboardingRoute({ ...complete, hasAcceptedTerms: false }),
      'Terms'
    );
  });

  it('sends a user who accepted terms but has no pseudo to ChooseUsername', () => {
    assert.equal(
      resolveOnboardingRoute({ ...complete, hasDisplayName: false }),
      'ChooseUsername'
    );
  });

  it('sends a user without a music profile to MusicConnect', () => {
    assert.equal(
      resolveOnboardingRoute({ ...complete, hasMusicProfile: false }),
      'MusicConnect'
    );
  });

  it('sends a user without photos to Photos, even if basic info is already set', () => {
    assert.equal(
      resolveOnboardingRoute({ ...complete, hasPhotos: false }),
      'Photos'
    );
  });

  it('sends a user missing only age/gender to BasicInfo, skipping earlier steps', () => {
    assert.equal(
      resolveOnboardingRoute({ ...complete, hasBasicInfo: false }),
      'BasicInfo'
    );
  });

  it('sends a fully completed account straight to MainTabs', () => {
    assert.equal(resolveOnboardingRoute(complete), 'MainTabs');
  });

  it('resolves the earliest unmet requirement when several are missing at once', () => {
    assert.equal(
      resolveOnboardingRoute({
        hasAcceptedTerms: true,
        hasDisplayName: false,
        hasMusicProfile: false,
        hasPhotos: false,
        hasBasicInfo: false,
      }),
      'ChooseUsername'
    );
  });
});
