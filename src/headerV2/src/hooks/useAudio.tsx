import { useMemo } from "react";
import ding from '../assets/ding.mp3';
import newMessageSound from '../assets/newMessageSound.mp3';

export const useDing = () => {
  return useMemo(() => new Audio(ding), []);
}

export const useNewMessageSound = () => {
  return new Audio(newMessageSound);
}
