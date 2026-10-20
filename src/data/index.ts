import type { FocusRepository } from './repository';
import { LocalStorageRepository } from './localRepository';

/** 永続化先の選択点。Firestore へ移行する際はここを差し替える。 */
export const repository: FocusRepository = new LocalStorageRepository();
export type { FocusRepository };
