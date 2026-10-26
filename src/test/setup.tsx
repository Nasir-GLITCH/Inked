/**
 * Global Jest setup. Only add mocks here for native modules that cannot run under Jest.
 */

// Icon fonts are loaded through native asset registration, which does not exist under Jest.
// The mock renders a plain View that keeps the icon name so tests can assert on it.
jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockMaterialIcons({ name, ...props }: { name: string }) {
      return <View {...props} testID={`MaterialIcons:${name}`} />;
    },
  };
});
