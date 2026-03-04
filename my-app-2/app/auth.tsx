import { Stack, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AccountAuthSections, AuthPalette, GuestAuthSections, LocalAuthMode } from '@/components/auth/AuthSections';
import { ActionButton } from '@/components/common/ActionButton';
import { StatusBanner as StatusBannerText, StatusBannerState } from '@/components/common/StatusBanner';
import { ThemeModePicker } from '@/components/settings/ThemeModePicker';
import { useAppContext } from '@/context/AppContext';
import {
  validateLocalLogin,
  validateLocalRegistration,
  validatePasswordChange,
  validateProfileUpdate,
} from '@/features/auth/validation';
import { authRedirectUri } from '@/services/authConfig';
import { getThemeTokens } from '@/theme/tokens';

WebBrowser.maybeCompleteAuthSession();

type ScreenPalette = AuthPalette & {
  pageBg: string;
  cardBg: string;
};

export default function AuthScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;
  const isPhone = width < 768;
  const isSmallPhone = width < 420;

  const {
    resolvedTheme,
    themePreference,
    setThemePreference,
    user,
    authLoading,
    signInWithGoogle,
    signInDemo,
    signInLocal,
    signUpLocal,
    updateProfile,
    updateSettings,
    changePassword,
    signOut,
  } = useAppContext();

  const [banner, setBanner] = useState<StatusBannerState>(null);
  const [demoName, setDemoName] = useState('');
  const [localMode, setLocalMode] = useState<LocalAuthMode>('login');
  const [localName, setLocalName] = useState('');
  const [localEmail, setLocalEmail] = useState('');
  const [localPassword, setLocalPassword] = useState('');
  const [localPasswordConfirm, setLocalPasswordConfirm] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [settingsLanguage, setSettingsLanguage] = useState<'uk' | 'en'>('uk');
  const [settingsEmailNotifications, setSettingsEmailNotifications] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const actionRequestIdRef = useRef(0);
  const navigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const localValidationError = useMemo(() => {
    if (localMode === 'register') {
      return validateLocalRegistration({
        name: localName,
        email: localEmail,
        password: localPassword,
        passwordConfirm: localPasswordConfirm,
      });
    }
    return validateLocalLogin({
      email: localEmail,
      password: localPassword,
    });
  }, [localEmail, localMode, localName, localPassword, localPasswordConfirm]);

  const localStarted = useMemo(() => {
    if (localMode === 'register') {
      return Boolean(
        localName.trim().length > 0 ||
          localEmail.trim().length > 0 ||
          localPassword.length > 0 ||
          localPasswordConfirm.length > 0
      );
    }
    return Boolean(localEmail.trim().length > 0 || localPassword.length > 0);
  }, [localEmail, localMode, localName, localPassword, localPasswordConfirm]);

  const localInlineValidation = localStarted ? localValidationError : null;
  const localSubmitDisabled = authLoading || Boolean(localValidationError);

  const profileValidationError = useMemo(
    () =>
      validateProfileUpdate({
        name: profileName,
        email: profileEmail,
        picture: profilePicture,
      }),
    [profileEmail, profileName, profilePicture]
  );
  const profileSaveDisabled = authLoading || Boolean(profileValidationError);

  const passwordAttempted = currentPassword.length > 0 || newPassword.length > 0;
  const passwordValidationError = useMemo(
    () =>
      validatePasswordChange({
        currentPassword,
        newPassword,
      }),
    [currentPassword, newPassword]
  );
  const passwordInlineValidation = passwordAttempted ? passwordValidationError : null;
  const passwordChangeDisabled = authLoading || Boolean(passwordValidationError);

  useEffect(() => {
    if (!user) {
      return;
    }
    setProfileName(user.name);
    setProfileEmail(user.email);
    setProfilePicture(user.picture ?? '');
    setSettingsLanguage(user.settings?.language === 'en' ? 'en' : 'uk');
    setSettingsEmailNotifications(
      typeof user.settings?.emailNotifications === 'boolean' ? user.settings.emailNotifications : true
    );
  }, [user]);

  const webOrigin = useMemo(() => {
    if (Platform.OS !== 'web') {
      return null;
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return 'http://localhost:19007';
  }, []);

  const palette = useMemo<ScreenPalette>(() => {
    const theme = getThemeTokens(resolvedTheme);
    return {
      pageBg: theme.colors.pageBg,
      cardBg: theme.colors.panelBg,
      textMain: theme.colors.textMain,
      textMuted: theme.colors.textMuted,
      border: theme.colors.border,
      inputBg: theme.colors.inputBg,
      primary: theme.colors.primary,
      secondary: theme.colors.secondary,
      success: theme.colors.success,
      error: theme.colors.danger,
      info: theme.colors.info,
      warning: theme.colors.warning,
      danger: theme.colors.danger,
    };
  }, [resolvedTheme]);

  const navigateToSearch = useCallback(() => {
    router.replace('/(tabs)');
  }, []);

  const clearNavigationTimer = useCallback(() => {
    if (navigationTimerRef.current) {
      clearTimeout(navigationTimerRef.current);
      navigationTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      actionRequestIdRef.current += 1;
      clearNavigationTimer();
    };
  }, [clearNavigationTimer]);

  const applyActionResult = useCallback(
    (
      requestId: number,
      result: { ok: boolean; message: string },
      options?: {
        navigateDelayMs?: number;
        onSuccess?: () => void;
      }
    ) => {
      if (requestId !== actionRequestIdRef.current) {
        return;
      }
      setBanner(result.ok ? { type: 'success', message: result.message } : { type: 'error', message: result.message });
      if (!result.ok) {
        return;
      }

      options?.onSuccess?.();
      if (options?.navigateDelayMs !== undefined) {
        clearNavigationTimer();
        navigationTimerRef.current = setTimeout(() => {
          if (requestId === actionRequestIdRef.current) {
            navigateToSearch();
          }
        }, options.navigateDelayMs);
      }
    },
    [clearNavigationTimer, navigateToSearch]
  );

  const handleGoogleToken = useCallback(
    async (idToken: string) => {
      const requestId = ++actionRequestIdRef.current;
      const result = await signInWithGoogle(idToken);
      applyActionResult(requestId, result, { navigateDelayMs: 400 });
    },
    [applyActionResult, signInWithGoogle]
  );

  const handleLocalSubmit = useCallback(async () => {
    const requestId = ++actionRequestIdRef.current;
    clearNavigationTimer();

    if (localMode === 'register') {
      const validationError = validateLocalRegistration({
        name: localName,
        email: localEmail,
        password: localPassword,
        passwordConfirm: localPasswordConfirm,
      });
      if (validationError) {
        if (requestId === actionRequestIdRef.current) {
          setBanner({ type: 'error', message: validationError });
        }
        return;
      }

      const result = await signUpLocal({
        name: localName.trim(),
        email: localEmail.trim(),
        password: localPassword,
      });
      applyActionResult(requestId, result, {
        navigateDelayMs: 300,
        onSuccess: () => {
          setLocalPassword('');
          setLocalPasswordConfirm('');
        },
      });
      return;
    }

    const validationError = validateLocalLogin({
      email: localEmail,
      password: localPassword,
    });
    if (validationError) {
      if (requestId === actionRequestIdRef.current) {
        setBanner({ type: 'error', message: validationError });
      }
      return;
    }

    const result = await signInLocal({
      email: localEmail.trim(),
      password: localPassword,
    });
    applyActionResult(requestId, result, {
      navigateDelayMs: 300,
      onSuccess: () => {
        setLocalPassword('');
      },
    });
  }, [
    applyActionResult,
    localEmail,
    localMode,
    localName,
    localPassword,
    localPasswordConfirm,
    clearNavigationTimer,
    signInLocal,
    signUpLocal,
  ]);

  const handleDemoSubmit = useCallback(async () => {
    const requestId = ++actionRequestIdRef.current;
    clearNavigationTimer();
    const result = await signInDemo(demoName.trim());
    applyActionResult(requestId, result, { navigateDelayMs: 300 });
  }, [applyActionResult, clearNavigationTimer, demoName, signInDemo]);

  const onSaveProfile = useCallback(async () => {
    const validationError = validateProfileUpdate({
      name: profileName,
      email: profileEmail,
      picture: profilePicture,
    });
    if (validationError) {
      setBanner({ type: 'error', message: validationError });
      return;
    }

    const requestId = ++actionRequestIdRef.current;
    const result = await updateProfile({
      name: profileName.trim(),
      email: profileEmail.trim(),
      picture: profilePicture.trim() ? profilePicture.trim() : null,
    });
    applyActionResult(requestId, result);
  }, [applyActionResult, profileEmail, profileName, profilePicture, updateProfile]);

  const onSaveSettings = useCallback(async () => {
    const requestId = ++actionRequestIdRef.current;
    const result = await updateSettings({
      language: settingsLanguage,
      emailNotifications: settingsEmailNotifications,
      theme: themePreference,
    });
    applyActionResult(requestId, result);
  }, [applyActionResult, settingsEmailNotifications, settingsLanguage, themePreference, updateSettings]);

  const onChangePassword = useCallback(async () => {
    const validationError = validatePasswordChange({
      currentPassword,
      newPassword,
    });
    if (validationError) {
      setBanner({ type: 'error', message: validationError });
      return;
    }

    const requestId = ++actionRequestIdRef.current;
    const result = await changePassword({
      currentPassword,
      newPassword,
    });
    applyActionResult(requestId, result, {
      onSuccess: () => {
        setCurrentPassword('');
        setNewPassword('');
      },
    });
  }, [applyActionResult, changePassword, currentPassword, newPassword]);

  const handleSignOut = useCallback(() => {
    const requestId = ++actionRequestIdRef.current;
    clearNavigationTimer();
    signOut()
      .then(() => {
        if (requestId === actionRequestIdRef.current) {
          setBanner({ type: 'info', message: 'Ви вийшли з акаунта.' });
        }
      })
      .catch((error) => {
        if (requestId !== actionRequestIdRef.current) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Не вдалося завершити сесію.';
        setBanner({ type: 'error', message });
      });
  }, [clearNavigationTimer, signOut]);

  const handleGoogleError = useCallback(
    (message: string) => {
      const requestId = ++actionRequestIdRef.current;
      clearNavigationTimer();
      if (requestId === actionRequestIdRef.current) {
        setBanner({ type: 'error', message });
      }
    },
    [clearNavigationTimer]
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.container, isPhone && styles.containerPhone, { backgroundColor: palette.pageBg }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
          <View
            style={[
              styles.card,
              isPhone && styles.cardPhone,
              isWide && styles.cardWide,
              { backgroundColor: palette.cardBg, borderColor: palette.border },
            ]}>
          <Text style={[styles.title, isPhone && styles.titlePhone, { color: palette.textMain }]}>Авторизація</Text>
          <Text style={[styles.subtitle, isSmallPhone && styles.subtitleSmall, { color: palette.textMuted }]}>
            Локальний акаунт, Google вхід або демо-режим. Після входу тут же доступні профіль і налаштування.
          </Text>

          <ThemeModePicker
            value={themePreference}
            onChange={setThemePreference}
            textColor={palette.textMain}
            activeBackground={palette.primary}
            inactiveBackground={palette.secondary}
            borderColor={palette.border}
          />

          {!user ? (
            <GuestAuthSections
              palette={palette}
              authLoading={authLoading}
              isWide={isWide}
              localMode={localMode}
              localName={localName}
              localEmail={localEmail}
              localPassword={localPassword}
              localPasswordConfirm={localPasswordConfirm}
              demoName={demoName}
              localValidationMessage={localInlineValidation}
              localSubmitDisabled={localSubmitDisabled}
              demoSubmitDisabled={authLoading}
              onLocalModeChange={setLocalMode}
              onLocalNameChange={setLocalName}
              onLocalEmailChange={setLocalEmail}
              onLocalPasswordChange={setLocalPassword}
              onLocalPasswordConfirmChange={setLocalPasswordConfirm}
              onDemoNameChange={setDemoName}
              onLocalSubmit={handleLocalSubmit}
              onGoogleToken={handleGoogleToken}
              onGoogleError={handleGoogleError}
              onDemoSubmit={handleDemoSubmit}
            />
          ) : (
            <AccountAuthSections
              palette={palette}
              authLoading={authLoading}
              isWide={isWide}
              userProvider={user.provider}
              profileName={profileName}
              profileEmail={profileEmail}
              profilePicture={profilePicture}
              settingsLanguage={settingsLanguage}
              settingsEmailNotifications={settingsEmailNotifications}
              currentPassword={currentPassword}
              newPassword={newPassword}
              profileValidationMessage={profileValidationError}
              profileSaveDisabled={profileSaveDisabled}
              passwordValidationMessage={passwordInlineValidation}
              passwordChangeDisabled={passwordChangeDisabled}
              onProfileNameChange={setProfileName}
              onProfileEmailChange={setProfileEmail}
              onProfilePictureChange={setProfilePicture}
              onSettingsLanguageChange={setSettingsLanguage}
              onSettingsEmailNotificationsToggle={() => setSettingsEmailNotifications((prev) => !prev)}
              onCurrentPasswordChange={setCurrentPassword}
              onNewPasswordChange={setNewPassword}
              onSaveProfile={onSaveProfile}
              onSaveSettings={onSaveSettings}
              onChangePassword={onChangePassword}
              onNavigateSearch={navigateToSearch}
              onSignOut={handleSignOut}
            />
          )}

          {!user ? (
            <ActionButton
              label="Повернутись до пошуку"
              backgroundColor={palette.secondary}
              textColor={palette.textMain}
              onPress={navigateToSearch}
            />
          ) : null}

          {user ? (
            <Text style={[styles.userText, { color: palette.success }]}>
              Увійшли як: {user.name} ({user.provider})
            </Text>
          ) : (
            <Text style={[styles.userText, { color: palette.textMuted }]}>Не авторизовано</Text>
          )}

          {Platform.OS === 'web' ? (
            <View style={styles.originBlock}>
              <Text selectable style={[styles.helperText, { color: palette.textMuted }]}>
                Поточний origin: {webOrigin}
              </Text>
              <Text selectable style={[styles.helperText, { color: palette.textMuted }]}>
                Додайте цей origin у Google Cloud → OAuth Client → Authorized JavaScript origins.
              </Text>
              <Text selectable style={[styles.helperText, { color: palette.textMuted }]}>
                Для веб-входу redirect URI не використовується (лише origin).
              </Text>
            </View>
          ) : (
            <Text selectable style={[styles.helperText, { color: palette.textMuted }]}>
              URI переадресації (native): {authRedirectUri}
            </Text>
          )}

          <StatusBannerText
            banner={banner}
            errorColor={palette.error}
            successColor={palette.success}
            infoColor={palette.info}
            containerStyle={styles.banner}
          />

          <View style={[styles.tips, { borderColor: palette.border }]}>
            <Text style={[styles.tipTitle, { color: palette.textMain }]}>Підказки</Text>
            <Text style={[styles.tipText, { color: palette.textMuted }]}>
              Локальний пароль: мінімум 8 символів, обовʼязково букви та цифри.
            </Text>
            <Text style={[styles.tipText, { color: palette.textMuted }]}>
              Для Google OAuth перевірте origin і дочекайтесь 5-10 хв після змін у Google Cloud.
            </Text>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  containerPhone: {
    padding: 12,
    justifyContent: 'flex-start',
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 10,
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
  },
  cardPhone: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  cardWide: {
    maxWidth: 1180,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    fontFamily: 'SpaceMono',
  },
  titlePhone: {
    fontSize: 30,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 6,
  },
  subtitleSmall: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    marginTop: 6,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
  },
  banner: {
    marginTop: 2,
  },
  tips: {
    marginTop: 8,
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 4,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  tipText: {
    fontSize: 13,
  },
  originBlock: {
    gap: 2,
  },
});
