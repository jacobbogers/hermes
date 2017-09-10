// Where does this go?
/* REM entries<
T extends {[key: string]: any },
K extends keyof T
>(o: T): [keyof T, T[K]][];
*/

import { deepClone } from './deepClone';
import { flatMap } from './flatMap';
import { flatten } from './flatten';
import { ifEmptyString } from './ifEmptyString';
import { ifInvalidPortString } from './ifInvalidPortString';
import { ifNull } from './ifNull';
import { ifUndefined } from './ifUndefined';
import { IAnyObjProps } from './interfaces';
import { loadFiles } from './loadFiles';
import { makeObjectNull } from './makeObjectNull';
import { makeValueslowerCase } from './makeValueslowerCase';
import { MapWithIndexes } from './MapWithIndexes';
import { OperationResult } from './OperationResult';
import { validationFactory } from './validationFactory';

export {
  deepClone,
  flatMap,
  flatten,
  ifEmptyString,
  ifInvalidPortString,
  ifNull,
  ifUndefined,
  IAnyObjProps,
  loadFiles,
  makeObjectNull,
  makeValueslowerCase,
  MapWithIndexes,
  OperationResult,
  validationFactory
};

export * from './copyProperties';
