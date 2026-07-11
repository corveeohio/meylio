export type OnboardingState = {
  hasAcceptedTerms: boolean;
  hasDisplayName: boolean;
  hasMusicProfile: boolean;
  hasPhotos: boolean;
  hasBasicInfo: boolean;
};

export type OnboardingRoute = 'Terms' | 'ChooseUsername' | 'MusicConnect' | 'Photos' | 'BasicInfo' | 'MainTabs';

export function resolveOnboardingRoute(state: OnboardingState): OnboardingRoute {
  if (!state.hasAcceptedTerms) return 'Terms';
  if (!state.hasDisplayName) return 'ChooseUsername';
  if (!state.hasMusicProfile) return 'MusicConnect';
  if (!state.hasPhotos) return 'Photos';
  if (!state.hasBasicInfo) return 'BasicInfo';
  return 'MainTabs';
}
