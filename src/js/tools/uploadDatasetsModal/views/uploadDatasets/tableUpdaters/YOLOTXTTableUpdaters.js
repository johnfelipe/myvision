import {
  insertRowToAnnotationsTable, insertRowToImagesTable, enableFinishButton, insertRowToClassesTable,
  changeAllImagesTableRowsToDefault, changeAnnotationRowToDefault, disableFinishButton,
} from '../style';
import validateYOLOTXTFormat from '../formatValidators/YOLOTXTValidator';
import {
  ONE_CLASSES_FILE_ALLOWED_ERROR_MESSAGE, VALID_ANNOTATION_FILES_ARRAY,
  IMAGE_FILES_OBJECT, CLASSES_FILES_ARRAY, ACTIVE_CLASSES_FILE,
} from '../../../consts';
import { getDatasetObject, updateImageFileErrorStatus } from '../datasetObjectManagers/YOLOTXTDatasetObjectManager';

function validateExistingImages(datasetObject) {
  if (datasetObject[VALID_ANNOTATION_FILES_ARRAY].length > 0) {
    let foundValid = false;
    Object.keys(datasetObject[IMAGE_FILES_OBJECT]).forEach((key) => {
      const imageFile = datasetObject[IMAGE_FILES_OBJECT][key];
      const validationResult = validateYOLOTXTFormat(imageFile);
      if (!validationResult.error) { foundValid = true; }
      const { name } = imageFile.body.fileMetaData;
      insertRowToImagesTable(name, validationResult);
      updateImageFileErrorStatus(name, validationResult.error);
    });
    if (foundValid) {
      enableFinishButton();
    } else {
      disableFinishButton();
    }
  } else {
    changeAllImagesTableRowsToDefault();
    disableFinishButton();
  }
}

function reValidateExistingClassesFiles(classesFiles) {
  classesFiles.forEach((classesFile) => {
    const validationResult = validateYOLOTXTFormat(classesFile);
    const { name } = classesFile.body.fileMetaData;
    if (!validationResult.error) {
      validationResult.error = true;
      validationResult.message = ONE_CLASSES_FILE_ALLOWED_ERROR_MESSAGE;
    }
    insertRowToClassesTable(name, validationResult);
  });
}

function checkClassesFileAlreadyInTable(validationResult, datasetObject) {
  const activeClassesFile = datasetObject[ACTIVE_CLASSES_FILE];
  const classFiles = datasetObject[CLASSES_FILES_ARRAY];
  if (!validationResult.error) {
    reValidateExistingClassesFiles(classFiles);
    // validate existing annotations
    validateExistingImages(datasetObject);
    return validationResult;
  }
  if (classFiles.length > 0) {
    if (activeClassesFile && activeClassesFile.newlyActive) {
      // change classes row to default
      changeAnnotationRowToDefault(activeClassesFile.body.fileMetaData.name);
      activeClassesFile.newlyActive = false;
      // validate existing annotations
      validateExistingImages(datasetObject);
    }
    return { error: true, message: validationResult.message };
  }
  // change all annotation files to default
  // similar validations should still apply for annotations -> images tables
  changeAllImagesTableRowsToDefault();
  return validationResult;
}

function updateYOLOTXTTables(parsedObj, validationResult) {
  const datasetObject = getDatasetObject();
  const fileName = parsedObj.body.fileMetaData.name;
  if (parsedObj.fileFormat === 'image') {
    insertRowToImagesTable(fileName, validationResult);
    if (validationResult.valid) { enableFinishButton(); }
  } else if (parsedObj.fileFormat === 'annotation') {
    validateExistingImages(datasetObject);
    insertRowToAnnotationsTable(fileName, validationResult);
  } else if (parsedObj.fileFormat === 'classes') {
    const newValidationResult = checkClassesFileAlreadyInTable(
      validationResult, datasetObject,
    );
    // whilst the reValidateExistingAnnotations inserts the new annotation,
    // this overwrites it if it has been incorrectly set with an error
    insertRowToClassesTable(fileName, newValidationResult);
  }
}

export { updateYOLOTXTTables as default };
