import { drawImageFromList, getImageProperties, calculateCurrentImageHeightRatio } from '../toolkit/buttonClickEvents/facadeWorkersUtils/uploadFile/drawImageOnCanvas';
import { removeAndRetrieveAllShapeRefs } from '../../canvas/objects/allShapes/allShapes';
import { removeAndRetrieveAllLabelRefs } from '../../canvas/objects/label/label';
import { repopulateLabelAndShapeObjects, setShapeMovablePropertiesOnImageSelect } from '../../canvas/objects/allShapes/labelAndShapeBuilder';
import { resetZoom, zoomOutObjectOnImageSelect, switchCanvasWrapperInnerElement } from '../toolkit/buttonClickEvents/facadeWorkers/zoomWorker';
import { removeAllLabelListItems } from '../labelList/labelList';
import { setDefaultState, setCurrentImageId } from '../toolkit/buttonClickEvents/facadeWorkersUtils/stateMachine';
import { switchCanvasWrapperInnerElementsDisplay } from '../../canvas/utils/canvasUtils';
import labelProperties from '../../canvas/objects/label/properties';
import { initialiseImageListML } from './imageListML';
import { getCanvasReferences } from '../../canvas/utils/fabricUtils';
import assignDefaultEvents from '../../canvas/mouseInteractions/mouseEvents/eventHandlers/defaultEventHandlers';
import { changeCurrentImageName } from '../imageSwitchPanel/style';

let currentlyActiveElement = null;
const images = [];
let currentlySelectedImageId = 0;
let newImageId = 0;
let firstImage = true;
let imageListOverflowParent = null;

function findImageListElement() {
  imageListOverflowParent = document.getElementById('image-list-overflow-parent');
}

function initialiseImageListFunctionality() {
  findImageListElement();
  initialiseImageListML(images);
}

function getAllImageData() {
  return images;
}

function getImageIdByName(imageName) {
  for (let i = 0; i < images.length; i += 1) {
    if (imageName === images[i].name) {
      return i;
    }
  }
  return null;
}

function getLastImageIdByName(imageName) {
  for (let i = images.length - 1; i >= 0; i -= 1) {
    if (imageName === images[i].name) {
      return i;
    }
  }
  return null;
}

function initialiseImageElement() {
  return document.createElement('img');
}

function initiateDivElement() {
  return document.createElement('div');
}

function addNewItemToImageList(imageData) {
  const imageThumbnailElement = initialiseImageElement();
  imageThumbnailElement.id = newImageId;
  imageThumbnailElement.classList.add('image-list-thumbnail-image');
  imageThumbnailElement.src = imageData.src;
  const colorOverlayElement = initiateDivElement();
  colorOverlayElement.classList.add('image-list-thumbnail-color-overlay');
  colorOverlayElement.classList.add('image-list-thumbnail-default');
  const tickSVGElement = initialiseImageElement();
  tickSVGElement.classList.add('image-list-thumbnail-SVG-tick-icon');
  tickSVGElement.src = 'done-tick-highlighted.svg';
  const parentThumbnailDivElement = initiateDivElement();
  parentThumbnailDivElement.classList.add('image-list-thumbnail');
  parentThumbnailDivElement.onclick = window.switchImage.bind(this, newImageId);
  parentThumbnailDivElement.appendChild(imageThumbnailElement);
  parentThumbnailDivElement.appendChild(colorOverlayElement);
  parentThumbnailDivElement.appendChild(tickSVGElement);
  imageListOverflowParent.appendChild(parentThumbnailDivElement);
  return parentThumbnailDivElement;
}

function displayTickSVGOverImageThumbnail(id) {
  const imageId = id !== undefined ? id : currentlySelectedImageId;
  images[imageId].thumbnailElementRef.childNodes[2].style.display = 'block';
}

function removeTickSVGOverImageThumbnail(id) {
  images[id].thumbnailElementRef.childNodes[2].style.display = 'none';
}

function removeTickSVGIfShapesPresent(id) {
  if (Object.keys(images[id].shapes).length > 0) {
    removeTickSVGOverImageThumbnail(id);
  }
}

function setDefaultImageThumbnailHighlightToMLSelected(element) {
  element.childNodes[1].classList.replace('image-list-thumbnail-default', 'image-list-thumbnail-machine-learning-selected');
  const imageId = element.childNodes[0].id;
  removeTickSVGIfShapesPresent(imageId);
}

function setDefaultImageThumbnailHighlightToML(element) {
  element.childNodes[1].classList.replace('image-list-thumbnail-default', 'image-list-thumbnail-machine-learning');
  element.childNodes[1].style.display = 'block';
  const imageId = element.childNodes[0].id;
  removeTickSVGIfShapesPresent(imageId);
}

function setMLThumbnailOverlayToMLSelected(element) {
  if (element.classList.contains('image-list-thumbnail-machine-learning')) {
    element.classList.replace('image-list-thumbnail-machine-learning', 'image-list-thumbnail-machine-learning-selected');
  }
}

function setThumbnailColourOverlayBackToDefault(element) {
  if (element.classList.contains('image-list-thumbnail-machine-learning-selected')) {
    element.classList.replace('image-list-thumbnail-machine-learning-selected', 'image-list-thumbnail-default');
    displayTickSVGOverImageThumbnail();
  }
}

function setMLGeneratedShapesToOriginalColorPallette() {
  if (images[currentlySelectedImageId].numberOfMLGeneratedShapes > 0) {
    Object.keys(images[currentlySelectedImageId].shapes).forEach((key) => {
      const shape = images[currentlySelectedImageId].shapes[key].shapeRef;
      if (shape.MLPallette) {
        shape.fill = shape.trueFill;
        shape.stroke = shape.trueStroke;
        shape.MLPallette = false;
      }
    });
    images[currentlySelectedImageId].numberOfMLGeneratedShapes = 0;
  }
}

function setCurrentlyActiveElementToInvisible() {
  if (currentlyActiveElement) {
    currentlyActiveElement.style.display = 'none';
    setThumbnailColourOverlayBackToDefault(currentlyActiveElement);
  }
}

function highlightImageThumbnail(element) {
  setCurrentlyActiveElementToInvisible();
  setMLThumbnailOverlayToMLSelected(element);
  element.style.display = 'block';
  currentlyActiveElement = element;
}

function addNewImage(imageName, imageData) {
  const thumbnailElementRef = addNewItemToImageList(imageData);
  const imageObject = {
    data: imageData, name: imageName, shapes: {}, labels: {}, thumbnailElementRef,
  };
  images.push(imageObject);
}

function captureCurrentImageData() {
  images[currentlySelectedImageId].shapes = removeAndRetrieveAllShapeRefs();
  images[currentlySelectedImageId].labels = removeAndRetrieveAllLabelRefs();
  const currentlySelectedImageProperties = getImageProperties();
  const imageDimensions = {};
  imageDimensions.scaleX = currentlySelectedImageProperties.scaleX;
  imageDimensions.scaleY = currentlySelectedImageProperties.scaleY;
  imageDimensions.originalWidth = currentlySelectedImageProperties.originalWidth;
  imageDimensions.originalHeight = currentlySelectedImageProperties.originalHeight;
  imageDimensions.oldImageHeightRatio = calculateCurrentImageHeightRatio();
  imageDimensions.polygonOffsetLeft = labelProperties.pointOffsetProperties().left;
  imageDimensions.polygonOffsetTop = labelProperties.pointOffsetProperties().top;
  images[currentlySelectedImageId].imageDimensions = imageDimensions;
}

function saveAndRemoveCurrentImageDetails() {
  if (!firstImage) {
    captureCurrentImageData();
  }
  removeAllLabelListItems();
  const timesZoomedOut = resetZoom(false);
  zoomOutObjectOnImageSelect(images[currentlySelectedImageId].shapes,
    images[currentlySelectedImageId].labels, timesZoomedOut);
  setMLGeneratedShapesToOriginalColorPallette();
  currentlySelectedImageId = newImageId;
  setCurrentImageId(newImageId);
  firstImage = false;
}

function setDefaultImageProperties(image, imageMetadata) {
  image.imageDimensions = { scaleX: 1, scaleY: 1 };
  image.shapes = {};
  image.labels = {};
  image.size = imageMetadata.size;
  image.numberOfMLGeneratedShapes = 0;
  image.analysedByML = false;
}

function changeCurrentImageElementText(imageName, firstFromMany) {
  changeCurrentImageName(imageName, images, currentlySelectedImageId, firstFromMany);
}

function addSingleImageToList(imageMetadata, imageData) {
  addNewImage(imageMetadata.name, imageData);
  highlightImageThumbnail(images[newImageId].thumbnailElementRef.childNodes[1]);
  saveAndRemoveCurrentImageDetails();
  changeCurrentImageElementText(imageMetadata.name);
  images[newImageId].thumbnailElementRef.scrollIntoView();
  setDefaultImageProperties(images[newImageId], imageMetadata);
  newImageId += 1;
}

function addImageFromMultiUploadToList(imageMetadata, imageData, firstFromMany) {
  addNewImage(imageMetadata.name, imageData);
  setDefaultImageProperties(images[newImageId], imageMetadata);
  if (firstFromMany) {
    highlightImageThumbnail(images[newImageId].thumbnailElementRef.childNodes[1]);
    saveAndRemoveCurrentImageDetails();
    changeCurrentImageElementText(imageMetadata.name, firstFromMany);
    images[newImageId].thumbnailElementRef.scrollIntoView();
  }
  newImageId += 1;
}

function isElementHeightFullyVisibleInParent(childElement, parentElement) {
  const childBoundingRect = childElement.getBoundingClientRect();
  const parentBoundingRect = parentElement.getBoundingClientRect();
  if (childBoundingRect.top < parentBoundingRect.top
    || childBoundingRect.bottom > parentBoundingRect.bottom) {
    return false;
  }
  return true;
}

function scrollIntoViewIfNeeded(childElement, parentElement) {
  if (!isElementHeightFullyVisibleInParent(childElement, parentElement)) {
    childElement.scrollIntoView();
  }
}

// to replicate the bug, carry out the following:
// upload image, draw bounding box, upload new image, come back to the first
// and use diagonal scaling to the right edge
// NOTE: some of the code to fix a similar bug is located in the purgeAllMouseEvents.js file
function fixForObjectScalingBugOnCanvasSwitch() {
  const { canvas1, canvas2 } = getCanvasReferences();
  if (canvas1.__eventListeners['object:scaling'].length > 1) {
    assignDefaultEvents(canvas2, null, false);
  }
}

// the reason why we do not use scaleX/scaleY is because these are returned in
// a promise as the image is drawn hence we do not have it at this time
// (for the new image)
function changeToExistingImage(id) {
  // things to take before evaluatng the current shapes on the current image
  // get shapes
  // zoomOutObjectOnImageSelect
  // make sure the scales are correct
  setDefaultState(false);
  captureCurrentImageData();
  removeAllLabelListItems();
  const timesZoomedOut = resetZoom(true);
  drawImageFromList(images[id].data);
  repopulateLabelAndShapeObjects(images[id].shapes, images[id].labels,
    images[id].imageDimensions, images[id].data);
  switchCanvasWrapperInnerElementsDisplay();
  setShapeMovablePropertiesOnImageSelect(images[id].shapes);
  zoomOutObjectOnImageSelect(images[currentlySelectedImageId].shapes,
    images[currentlySelectedImageId].labels, timesZoomedOut);
  setCurrentImageId(id);
  switchCanvasWrapperInnerElement();
  highlightImageThumbnail(images[id].thumbnailElementRef.childNodes[1]);
  scrollIntoViewIfNeeded(images[id].thumbnailElementRef, imageListOverflowParent);
  fixForObjectScalingBugOnCanvasSwitch();
  currentlySelectedImageId = id;
  changeCurrentImageElementText(images[currentlySelectedImageId].name);
}

function switchImage(direction) {
  if (direction === 'previous') {
    if (currentlySelectedImageId !== 0) {
      changeToExistingImage(currentlySelectedImageId - 1);
    }
  } else if (direction === 'next') {
    if (currentlySelectedImageId !== images.length - 1) {
      changeToExistingImage(currentlySelectedImageId + 1);
    }
  } else if (direction !== currentlySelectedImageId) {
    changeToExistingImage(direction);
  }
}

function canSwitchImage(direction) {
  if (direction === 'previous') {
    return currentlySelectedImageId > 0;
  }
  if (direction === 'next') {
    return currentlySelectedImageId < (images.length - 1);
  }
  return direction !== currentlySelectedImageId;
}

export {
  switchImage, canSwitchImage, addImageFromMultiUploadToList,
  initialiseImageListFunctionality, setDefaultImageThumbnailHighlightToML,
  displayTickSVGOverImageThumbnail, addSingleImageToList, getAllImageData,
  setDefaultImageThumbnailHighlightToMLSelected, removeTickSVGOverImageThumbnail,
  setThumbnailColourOverlayBackToDefault, getImageIdByName, getLastImageIdByName,
};
