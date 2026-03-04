import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { NativeGoogleLoginButton } from '@/components/auth/NativeGoogleLoginButton';
import { ActionButton } from '@/components/common/ActionButton';
import { googleClientId } from '@/services/authConfig';
import { ApiUser } from '@/types/api';

export type LocalAuthMode = 'login' | 'register';

export type AuthPalette = {
  border: string;
  inputBg: string;
  primary: string;
  secondary: string;
  success: string;
  error: string;
  info: string;
  textMain: string;
  textMuted: string;
  warning: string;
  danger: string;
};

type GuestAuthSectionsProps = {
  palette: AuthPalette;
  authLoading: boolean;
  isWide: boolean;
  localMode: LocalAuthMode;
  localName: string;
  localEmail: string;
  localPassword: string;
  localPasswordConfirm: string;
  demoName: string;
  onLocalModeChange: (mode: LocalAuthMode) => void;
  onLocalNameChange: (value: string) => void;
  onLocalEmailChange: (value: string) => void;
  onLocalPasswordChange: (value: string) => void;
  onLocalPasswordConfirmChange: (value: string) => void;
  onDemoNameChange: (value: string) => void;
  localValidationMessage?: string | null;
  localSubmitDisabled?: boolean;
  demoSubmitDisabled?: boolean;
  onLocalSubmit: () => void;
  onGoogleToken: (idToken: string) => void;
  onGoogleError: (message: string) => void;
  onDemoSubmit: () => void;
};

type AccountAuthSectionsProps = {
  palette: AuthPalette;
  authLoading: boolean;
  isWide: boolean;
  userProvider: ApiUser['provider'];
  profileName: string;
  profileEmail: string;
  profilePicture: string;
  settingsLanguage: 'uk' | 'en';
  settingsEmailNotifications: boolean;
  currentPassword: string;
  newPassword: string;
  onProfileNameChange: (value: string) => void;
  onProfileEmailChange: (value: string) => void;
  onProfilePictureChange: (value: string) => void;
  onSettingsLanguageChange: (value: 'uk' | 'en') => void;
  onSettingsEmailNotificationsToggle: () => void;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  profileValidationMessage?: string | null;
  profileSaveDisabled?: boolean;
  passwordValidationMessage?: string | null;
  passwordChangeDisabled?: boolean;
  onSaveProfile: () => void;
  onSaveSettings: () => void;
  onChangePassword: () => void;
  onNavigateSearch: () => void;
  onSignOut: () => void;
};

type PasswordFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  placeholderTextColor: string;
  inputBg: string;
  borderColor: string;
  textColor: string;
  secureTextEntry: boolean;
  onToggleSecureEntry: () => void;
  iconColor: string;
  toggleBackground: string;
  toggleBorderColor: string;
  returnKeyType?: 'done' | 'next' | 'go' | 'search' | 'send';
  onSubmitEditing?: () => void;
};

function PasswordField({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor,
  inputBg,
  borderColor,
  textColor,
  secureTextEntry,
  onToggleSecureEntry,
  iconColor,
  toggleBackground,
  toggleBorderColor,
  returnKeyType = 'done',
  onSubmitEditing,
}: PasswordFieldProps) {
  return (
    <View style={styles.passwordField}>
      <TextInput
        style={[
          styles.input,
          styles.passwordInput,
          {
            backgroundColor: inputBg,
            borderColor,
            color: textColor,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        secureTextEntry={secureTextEntry}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
      <Pressable
        style={({ pressed }) => [
          styles.passwordToggle,
          {
            backgroundColor: toggleBackground,
            borderColor: toggleBorderColor,
          },
          pressed && styles.passwordTogglePressed,
        ]}
        onPress={onToggleSecureEntry}
        accessibilityRole="button"
        accessibilityLabel={secureTextEntry ? 'Показати пароль' : 'Сховати пароль'}
        accessibilityHint="Перемикає режим видимості пароля"
        hitSlop={10}
        {...(Platform.OS === 'web' ? { title: secureTextEntry ? 'Показати пароль' : 'Сховати пароль' } : {})}>
        <Ionicons name={secureTextEntry ? 'eye-off-outline' : 'eye-outline'} size={18} color={iconColor} />
      </Pressable>
    </View>
  );
}

export function GuestAuthSections({
  palette,
  authLoading,
  isWide,
  localMode,
  localName,
  localEmail,
  localPassword,
  localPasswordConfirm,
  demoName,
  onLocalModeChange,
  onLocalNameChange,
  onLocalEmailChange,
  onLocalPasswordChange,
  onLocalPasswordConfirmChange,
  onDemoNameChange,
  localValidationMessage = null,
  localSubmitDisabled = false,
  demoSubmitDisabled = false,
  onLocalSubmit,
  onGoogleToken,
  onGoogleError,
  onDemoSubmit,
}: GuestAuthSectionsProps) {
  const [localPasswordHidden, setLocalPasswordHidden] = useState(true);
  const [localPasswordConfirmHidden, setLocalPasswordConfirmHidden] = useState(true);

  return (
    <View style={[styles.actions, isWide && styles.actionsWide]}>
      <View style={[styles.section, isWide && styles.sectionWide, { borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.textMain }]}>Локальний акаунт</Text>
        <View style={styles.inlineRow}>
          <Pressable
            style={[
              styles.modeButton,
              { backgroundColor: localMode === 'login' ? palette.primary : palette.secondary },
            ]}
            onPress={() => onLocalModeChange('login')}>
            <Text style={styles.modeButtonText}>Вхід</Text>
          </Pressable>
          <Pressable
            style={[
              styles.modeButton,
              { backgroundColor: localMode === 'register' ? palette.primary : palette.secondary },
            ]}
            onPress={() => onLocalModeChange('register')}>
            <Text style={styles.modeButtonText}>Реєстрація</Text>
          </Pressable>
        </View>

        {localMode === 'register' ? (
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.inputBg,
                borderColor: palette.border,
                color: palette.textMain,
              },
            ]}
            value={localName}
            onChangeText={onLocalNameChange}
            placeholder="Ім'я"
            placeholderTextColor={palette.textMuted}
            maxLength={120}
          />
        ) : null}
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: palette.inputBg,
              borderColor: palette.border,
              color: palette.textMain,
            },
          ]}
          value={localEmail}
          onChangeText={onLocalEmailChange}
          placeholder="Email"
          placeholderTextColor={palette.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          maxLength={160}
          returnKeyType={localMode === 'register' ? 'next' : 'done'}
          onSubmitEditing={localMode === 'login' ? onLocalSubmit : undefined}
        />
        <PasswordField
          value={localPassword}
          onChangeText={onLocalPasswordChange}
          placeholder={localMode === 'register' ? 'Пароль (мін 8, букви+цифри)' : 'Пароль'}
          placeholderTextColor={palette.textMuted}
          secureTextEntry={localPasswordHidden}
          onToggleSecureEntry={() => setLocalPasswordHidden((prev) => !prev)}
          inputBg={palette.inputBg}
          borderColor={palette.border}
          textColor={palette.textMain}
          iconColor={palette.textMain}
          toggleBackground={palette.inputBg}
          toggleBorderColor={palette.border}
          returnKeyType={localMode === 'register' ? 'next' : 'done'}
          onSubmitEditing={localMode === 'login' ? onLocalSubmit : undefined}
        />
        {localMode === 'register' ? (
          <PasswordField
            value={localPasswordConfirm}
            onChangeText={onLocalPasswordConfirmChange}
            placeholder="Повторіть пароль"
            placeholderTextColor={palette.textMuted}
            secureTextEntry={localPasswordConfirmHidden}
            onToggleSecureEntry={() => setLocalPasswordConfirmHidden((prev) => !prev)}
            inputBg={palette.inputBg}
            borderColor={palette.border}
            textColor={palette.textMain}
            iconColor={palette.textMain}
            toggleBackground={palette.inputBg}
            toggleBorderColor={palette.border}
            returnKeyType="done"
            onSubmitEditing={onLocalSubmit}
          />
        ) : null}

        <ActionButton
          backgroundColor={palette.primary}
          disabled={localSubmitDisabled}
          onPress={onLocalSubmit}
          textStyle={styles.buttonText}
          label={
            authLoading
              ? 'Обробка...'
              : localMode === 'register'
                ? 'Створити акаунт'
                : 'Увійти в акаунт'
          }
        />
        {localValidationMessage ? (
          <Text style={[styles.helperText, { color: palette.warning }]}>{localValidationMessage}</Text>
        ) : null}
      </View>

      <View style={[styles.section, isWide && styles.sectionWide, { borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.textMain }]}>Google</Text>
        {Platform.OS === 'web' ? (
          <>
            <GoogleSignInButton
              disabled={authLoading || !googleClientId}
              onToken={onGoogleToken}
              onError={onGoogleError}
            />
            {!googleClientId ? (
              <Text style={[styles.helperText, { color: palette.error }]}>
                Не задано EXPO_PUBLIC_GOOGLE_CLIENT_ID у my-app-2/.env
              </Text>
            ) : null}
          </>
        ) : (
          <NativeGoogleLoginButton
            authLoading={authLoading}
            onToken={onGoogleToken}
            onErrorMessage={onGoogleError}
            buttonColor={palette.primary}
          />
        )}
      </View>

      <View style={[styles.section, isWide && styles.sectionWide, { borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.textMain }]}>Демо</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: palette.inputBg,
              borderColor: palette.border,
              color: palette.textMain,
            },
          ]}
          value={demoName}
          onChangeText={onDemoNameChange}
          placeholder="Ваше ім'я (необов'язково)"
          placeholderTextColor={palette.textMuted}
          maxLength={80}
          returnKeyType="done"
          onSubmitEditing={onDemoSubmit}
        />
        <ActionButton
          backgroundColor="#0f766e"
          disabled={demoSubmitDisabled}
          onPress={onDemoSubmit}
          textStyle={styles.buttonText}
          label={authLoading ? 'Вхід...' : 'Продовжити як гість'}
        />
      </View>
    </View>
  );
}

export function AccountAuthSections({
  palette,
  authLoading,
  isWide,
  userProvider,
  profileName,
  profileEmail,
  profilePicture,
  settingsLanguage,
  settingsEmailNotifications,
  currentPassword,
  newPassword,
  onProfileNameChange,
  onProfileEmailChange,
  onProfilePictureChange,
  onSettingsLanguageChange,
  onSettingsEmailNotificationsToggle,
  onCurrentPasswordChange,
  onNewPasswordChange,
  profileValidationMessage = null,
  profileSaveDisabled = false,
  passwordValidationMessage = null,
  passwordChangeDisabled = false,
  onSaveProfile,
  onSaveSettings,
  onChangePassword,
  onNavigateSearch,
  onSignOut,
}: AccountAuthSectionsProps) {
  const [currentPasswordHidden, setCurrentPasswordHidden] = useState(true);
  const [newPasswordHidden, setNewPasswordHidden] = useState(true);

  return (
    <View style={[styles.actions, isWide && styles.actionsWide]}>
      <View style={[styles.section, isWide && styles.sectionWide, { borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.textMain }]}>Профіль</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: palette.inputBg,
              borderColor: palette.border,
              color: palette.textMain,
            },
          ]}
          value={profileName}
          onChangeText={onProfileNameChange}
          placeholder="Ім'я"
          placeholderTextColor={palette.textMuted}
          maxLength={120}
        />
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: palette.inputBg,
              borderColor: palette.border,
              color: palette.textMain,
            },
          ]}
          value={profileEmail}
          onChangeText={onProfileEmailChange}
          placeholder="Email"
          placeholderTextColor={palette.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          maxLength={160}
        />
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: palette.inputBg,
              borderColor: palette.border,
              color: palette.textMain,
            },
          ]}
          value={profilePicture}
          onChangeText={onProfilePictureChange}
          placeholder="URL аватара (необов'язково)"
          placeholderTextColor={palette.textMuted}
        />
        {profilePicture.trim() ? (
          <View style={[styles.avatarPreview, { borderColor: palette.border }]}>
            <Image source={{ uri: profilePicture.trim() }} style={styles.avatarImage} />
            <Text style={[styles.avatarHint, { color: palette.textMuted }]}>Попередній перегляд аватара</Text>
          </View>
        ) : null}
        <ActionButton
          backgroundColor={palette.primary}
          disabled={profileSaveDisabled}
          onPress={onSaveProfile}
          textStyle={styles.buttonText}
          label="Зберегти профіль"
        />
        {profileValidationMessage ? (
          <Text style={[styles.helperText, { color: palette.warning }]}>{profileValidationMessage}</Text>
        ) : null}
      </View>

      <View style={[styles.section, isWide && styles.sectionWide, { borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.textMain }]}>Налаштування</Text>
        <View style={styles.inlineRow}>
          <Pressable
            style={[
              styles.modeButton,
              { backgroundColor: settingsLanguage === 'uk' ? palette.primary : palette.secondary },
            ]}
            onPress={() => onSettingsLanguageChange('uk')}>
            <Text style={styles.modeButtonText}>UA</Text>
          </Pressable>
          <Pressable
            style={[
              styles.modeButton,
              { backgroundColor: settingsLanguage === 'en' ? palette.primary : palette.secondary },
            ]}
            onPress={() => onSettingsLanguageChange('en')}>
            <Text style={styles.modeButtonText}>EN</Text>
          </Pressable>
        </View>
        <Pressable
          style={[
            styles.modeButton,
            { backgroundColor: settingsEmailNotifications ? palette.success : palette.secondary },
          ]}
          onPress={onSettingsEmailNotificationsToggle}>
          <Text style={styles.modeButtonText}>
            Email сповіщення: {settingsEmailNotifications ? 'Увімкнено' : 'Вимкнено'}
          </Text>
        </Pressable>

        <ActionButton
          backgroundColor={palette.primary}
          disabled={authLoading}
          onPress={onSaveSettings}
          textStyle={styles.buttonText}
          label="Зберегти налаштування"
        />
      </View>

      {userProvider === 'local' ? (
        <View style={[styles.section, isWide && styles.sectionWide, { borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.textMain }]}>Зміна паролю</Text>
        <PasswordField
          value={currentPassword}
          onChangeText={onCurrentPasswordChange}
            placeholder="Поточний пароль"
            placeholderTextColor={palette.textMuted}
            secureTextEntry={currentPasswordHidden}
          onToggleSecureEntry={() => setCurrentPasswordHidden((prev) => !prev)}
          inputBg={palette.inputBg}
          borderColor={palette.border}
          textColor={palette.textMain}
          iconColor={palette.textMain}
          toggleBackground={palette.inputBg}
          toggleBorderColor={palette.border}
          returnKeyType="next"
        />
        <PasswordField
          value={newPassword}
          onChangeText={onNewPasswordChange}
            placeholder="Новий пароль"
            placeholderTextColor={palette.textMuted}
            secureTextEntry={newPasswordHidden}
          onToggleSecureEntry={() => setNewPasswordHidden((prev) => !prev)}
          inputBg={palette.inputBg}
          borderColor={palette.border}
          textColor={palette.textMain}
          iconColor={palette.textMain}
          toggleBackground={palette.inputBg}
          toggleBorderColor={palette.border}
          returnKeyType="done"
          onSubmitEditing={onChangePassword}
        />
          <ActionButton
            backgroundColor={palette.warning}
            disabled={passwordChangeDisabled}
            onPress={onChangePassword}
            textStyle={styles.buttonText}
            label="Змінити пароль"
          />
          {passwordValidationMessage ? (
            <Text style={[styles.helperText, { color: palette.warning }]}>{passwordValidationMessage}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.inlineRow}>
        <ActionButton
          backgroundColor={palette.secondary}
          onPress={onNavigateSearch}
          style={styles.compactButton}
          textColor={palette.textMain}
          textStyle={styles.secondaryButtonText}
          label="До пошуку"
        />
        <ActionButton
          backgroundColor={palette.danger}
          onPress={onSignOut}
          style={styles.compactButton}
          textStyle={styles.buttonText}
          label="Вийти"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
    marginTop: 4,
  },
  actionsWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  section: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  sectionWide: {
    flexBasis: 320,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
  },
  passwordField: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 40,
  },
  passwordToggle: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordTogglePressed: {
    opacity: 0.75,
  },
  avatarPreview: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    gap: 6,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: '#111827',
  },
  avatarHint: {
    fontSize: 12,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  modeButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modeButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  compactButton: {
    minWidth: 140,
    flexGrow: 1,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
  },
});
