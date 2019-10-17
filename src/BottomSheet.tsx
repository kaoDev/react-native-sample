import React, {
  forwardRef,
  ReactNode,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  PanResponderInstance,
  Platform,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

const SUPPORTED_ORIENTATIONS = [
  'portrait' as const,
  'portrait-upside-down' as const,
  'landscape' as const,
  'landscape-left' as const,
  'landscape-right' as const,
];

const initialHeight = new Animated.Value(0);
const initialPan = new Animated.ValueXY();

interface Props {
  animationType?: 'none' | 'slide' | 'fade';
  height?: number;
  minClosingHeight?: number;
  duration?: number;
  closeOnDragDown?: boolean;
  closeOnPressMask?: boolean;
  closeOnPressBack?: boolean;
  customStyles?: {
    wrapper?: StyleProp<ViewStyle>;
    container?: StyleProp<ViewStyle>;
    draggableIcon?: StyleProp<ViewStyle>;
  };
  onClose?: () => void;
  children?: ReactNode;
}

const usePanResponder = (
  pan: Animated.ValueXY,
  closeOnDragDown: boolean,
  height: number,
  setModalVisibility: (visible: boolean) => void,
) => {
  const panResponder = useRef<PanResponderInstance>();

  useEffect(() => {
    panResponder.current = PanResponder.create({
      onStartShouldSetPanResponder: () => closeOnDragDown,
      onPanResponderMove: (e, gestureState) => {
        if (gestureState.dy > 0) {
          Animated.event([null, {dy: pan.y}])(e, gestureState);
        }
      },
      onPanResponderRelease: (_e, gestureState) => {
        if (height / 4 - gestureState.dy < 0) {
          setModalVisibility(false);
        } else {
          Animated.spring(pan, {toValue: {x: 0, y: 0}}).start();
        }
      },
    });
  }, [pan, height]);

  return panResponder;
};

const useBottomSheetVisibility = ({
  animatedHeight,
  height,
  duration,
  minClosingHeight,
  pan,
  onClose,
}: {
  height: number;
  minClosingHeight: number;
  duration: number;
  onClose?: () => void;
  animatedHeight: Animated.Value;
  pan: Animated.ValueXY;
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const setModalVisibility = useCallback(
    (visible: boolean) => {
      if (visible) {
        setModalVisible(true);
        Animated.timing(animatedHeight, {
          toValue: height,
          duration,
        }).start(() => {
          animatedHeight.setValue(height);
        });
      } else {
        Animated.timing(animatedHeight, {
          toValue: minClosingHeight,
          duration,
        }).start(() => {
          setModalVisible(false);
          pan.setValue({x: 0, y: 0});

          if (onClose) onClose();
        });
      }
    },
    [
      setModalVisible,
      animatedHeight,
      height,
      duration,
      minClosingHeight,
      pan,
      onClose,
    ],
  );

  return {modalVisible, setModalVisibility};
};

export const BottomSheet = forwardRef<
  {open: () => void; close: () => void},
  Props
>(
  (
    {
      children,
      onClose,
      animationType = 'none',
      height = 260,
      minClosingHeight = 0,
      duration = 300,
      closeOnDragDown = false,
      closeOnPressMask = true,
      closeOnPressBack = true,
      customStyles = {},
    },
    ref,
  ) => {
    const [animatedHeight] = useState(initialHeight);
    const [pan] = useState(initialPan);

    const {modalVisible, setModalVisibility} = useBottomSheetVisibility({
      height,
      onClose,
      minClosingHeight,
      duration,
      pan,
      animatedHeight,
    });
    const panResponder = usePanResponder(
      pan,
      closeOnDragDown,
      height,
      setModalVisibility,
    );

    const close = () => {
      setModalVisibility(false);
    };
    const open = () => {
      setModalVisibility(true);
    };

    useImperativeHandle(
      ref,
      () => ({
        open,
        close,
      }),
      [setModalVisibility],
    );

    const panStyle = {
      transform: pan.getTranslateTransform(),
    };

    return (
      <Modal
        transparent
        animationType={animationType}
        visible={modalVisible}
        supportedOrientations={SUPPORTED_ORIENTATIONS}
        onRequestClose={() => {
          if (closeOnPressBack) close();
        }}>
        <KeyboardAvoidingView
          enabled={Platform.OS === 'ios'}
          behavior="padding"
          style={[styles.wrapper, customStyles.wrapper]}>
          <TouchableOpacity
            style={styles.mask}
            activeOpacity={1}
            onPress={() => (closeOnPressMask ? close() : null)}
          />
          {panResponder.current && (
            <Animated.View
              {...panResponder.current.panHandlers}
              style={[
                panStyle,
                styles.container,
                {height: animatedHeight},
                customStyles.container,
              ]}>
              {closeOnDragDown && (
                <View style={styles.draggableContainer}>
                  <View
                    style={[styles.draggableIcon, customStyles.draggableIcon]}
                  />
                </View>
              )}
              <View style={styles.content}>{children}</View>
            </Animated.View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#00000077',
  },
  mask: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    backgroundColor: '#fff',
    width: '100%',
    height: 0,
    overflow: 'hidden',
  },
  draggableContainer: {
    alignSelf: 'flex-start',
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  draggableIcon: {
    width: 35,
    height: 5,
    borderRadius: 5,
    margin: 10,
    backgroundColor: '#ccc',
  },
  content: {
    flex: 1,
  },
});
