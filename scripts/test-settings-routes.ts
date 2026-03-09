import assert from 'node:assert/strict'
import { SettingsRoutes } from '../src/components/app/settings-routes'
import { Settings } from '../src/components/screens/settings'

type SettingsRoutesProps = Parameters<typeof SettingsRoutes>[0]

const noop = () => {}
const asyncNoop = async () => {}

const baseProps: SettingsRoutesProps = {
  currentScreen: 'settings',
  sport: 'wrestling',
  trainingDays: 4,
  equipment: 'gym',
  weightUnit: 'kg',
  experienceLevel: 'intermediate',
  bodyweightKg: 82,
  primaryGoal: 'balanced',
  combatSessionsPerWeek: 2,
  sessionMinutes: 60,
  injuryNotes: 'None',
  hasWorkoutToday: true,
  hasUnsavedProgramChanges: true,
  isPremium: false,
  subscriptionStatus: null,
  subscriptionPeriodEnd: null,
  customWorkoutUsage: 1,
  learningPathUsage: 2,
  settingsScrollTop: 144,
  navigateTo: noop,
  onStartAction: noop,
  onSportChange: noop,
  onDaysChange: noop,
  onEquipmentChange: noop,
  onWeightUnitChange: noop,
  onExperienceLevelChange: noop,
  onBodyweightKgChange: noop,
  onPrimaryGoalChange: noop,
  onCombatSessionsChange: noop,
  onSessionMinutesChange: noop,
  onInjuryNotesChange: noop,
  onSave: asyncNoop,
  onLogout: noop,
  onSaveProgramChanges: asyncNoop,
  onRevertProgramChanges: noop,
  onResetProgram: asyncNoop,
  onStartSubscription: asyncNoop,
  onManageSubscription: asyncNoop,
  onSettingsScrollChange: noop,
}

const settingsElement = SettingsRoutes(baseProps)

assert.ok(settingsElement, 'SettingsRoutes should render an element for the settings screen')
assert.equal(settingsElement.type, Settings, 'SettingsRoutes should delegate to the Settings screen component')
assert.equal(settingsElement.props.onNavigate, baseProps.navigateTo, 'navigateTo should be passed through as onNavigate')
assert.equal(settingsElement.props.initialScrollTop, baseProps.settingsScrollTop, 'settingsScrollTop should be passed through as initialScrollTop')
assert.equal(settingsElement.props.onScrollChange, baseProps.onSettingsScrollChange, 'onSettingsScrollChange should be passed through as onScrollChange')
assert.equal(settingsElement.props.onSave, baseProps.onSave, 'onSave should be forwarded unchanged')
assert.equal(settingsElement.props.onLogout, baseProps.onLogout, 'onLogout should be forwarded unchanged')
assert.equal(settingsElement.props.onSaveProgramChanges, baseProps.onSaveProgramChanges, 'program save handler should be forwarded unchanged')
assert.equal(settingsElement.props.onRevertProgramChanges, baseProps.onRevertProgramChanges, 'program revert handler should be forwarded unchanged')
assert.equal(settingsElement.props.onResetProgram, baseProps.onResetProgram, 'program reset handler should be forwarded unchanged')
assert.equal(settingsElement.props.onStartSubscription, baseProps.onStartSubscription, 'subscription start handler should be forwarded unchanged')
assert.equal(settingsElement.props.onManageSubscription, baseProps.onManageSubscription, 'subscription management handler should be forwarded unchanged')

const otherScreenElement = SettingsRoutes({
  ...baseProps,
  currentScreen: 'home',
})

assert.equal(otherScreenElement, null, 'SettingsRoutes should render nothing for non-settings screens')

console.log('Settings route tests passed (wrapper delegation and prop mapping).')