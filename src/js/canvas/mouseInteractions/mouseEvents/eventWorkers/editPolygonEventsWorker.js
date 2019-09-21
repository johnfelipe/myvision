import {
  setEditablePolygon, movePolygonPoint,
  removePolygonPoints, displayPolygonPointsAfterMove,
  setEditablePolygonAfterMoving, resetPolygonSelectableArea,
  sendPolygonPointsToFront, getPolygonEditingStatus,
} from '../../../objects/polygon/alterPolygon/alterPolygon';
import { enableActiveObjectsAppearInFront, preventActiveObjectsAppearInFront } from '../../../utils/canvasUtils';
import { getLabelById } from '../../../objects/label/label';
import labelProperies from '../../../objects/label/properties';
import {
  setRemovingPointsAfterCancelDrawState, setLastPolygonActionWasMoveState,
  getRemovingPointsAfterCancelDrawState, getCurrentZoomState,
} from '../../../../tools/toolkit/buttonEvents/facadeWorkersUtils/stateManager';
import { highlightLabelInTheList, removeHighlightOfListLabel } from '../../../../tools/labelList/labelListHighlightUtils';
import { highlightShapeFill, defaultShapeFill } from '../../../objects/allShapes/allShapes';

let canvas = null;
let polygonMoved = false;
let labelObject = null;
let polygonPointMoved = false;
let selectedShapeId = null;
let shapeSetToInvisible = false;
let newPolygonSelected = false;
let setEditablePolygonOnClick = null;
let finishedAddingNewPoints = false;
let lastShapeSelectedIsBoundingBox = false;
let mouseIsDown = false;

function programaticallySelectBoundingBox(boundingBoxObj) {
  canvas.setActiveObject(boundingBoxObj);
}

function programaticallyDeselectBoundingBox() {
  canvas.discardActiveObject();
  canvas.renderAll();
}

function setEditablePolygonOnClickFunc(event) {
  if (getPolygonEditingStatus()) {
    // selecting another polygon without moving the first one
    removePolygonPoints();
  }
  setEditablePolygon(canvas, event.target);
  selectedShapeId = event.target.id;
}

function assignSetEditablePolygonOnClickFunc() {
  setEditablePolygonOnClick = setEditablePolygonOnClickFunc;
}

function skipMouseUpEvent() {
  canvas.__eventListeners['mouse:down'] = [];
  canvas.on('mouse:down', (e) => {
    polygonMouseDownEvents(e);
  });
  assignSetEditablePolygonOnClickFunc();
}

function setEditablePolygonWhenPolygonMoved(event) {
  if (newPolygonSelected) {
    setEditablePolygonAfterMoving(canvas, event.target);
    selectedShapeId = event.target.id;
  } else {
    displayPolygonPointsAfterMove();
  }
  polygonMoved = false;
}

function resetPolygonSelectableAreaAfterPointMoved() {
  resetPolygonSelectableArea();
  polygonPointMoved = false;
}

function setPolygonNotEditableOnClick() {
  removePolygonPoints();
  selectedShapeId = null;
}

// smart system where label would readjust upon mouse up if it's edges are outside of canvas
// stop shapes from being able to move outside of canvas

// validation for label (not empty string etc.)

// upon selecting-dragging a polygon does not remove the active label of the previous shape on list
// whereas rectangle is immediate, only way this can be mitigated is by removing rectangle controls
// on moving it in order to have delay the label change too, or you can display polygon points
// on mouse down click and upon moving the polygon

// use different colours for different labels
// investigate the potential of having a rightclick menu to manipulate shapes
// in add or remove points modes, send all objects to the front

// think about adding a screen wide scrosshair and show coordinates to the user

// reduce nested if statements in code
function polygonMouseDownEvents(event) {
  mouseIsDown = true;
  if (event.target) {
    enableActiveObjectsAppearInFront(canvas);
    if (event.target.shapeName === 'bndBox') {
      removeHighlightOfListLabel();
      highlightLabelInTheList(event.target.id);
      if (getPolygonEditingStatus()) {
        setPolygonNotEditableOnClick();
        newPolygonSelected = false;
      }
      selectedShapeId = event.target.id;
      labelObject = getLabelById(event.target.id);
      lastShapeSelectedIsBoundingBox = true;
      preventActiveObjectsAppearInFront(canvas);
    } else {
      if (event.target.shapeName === 'polygon' && event.target.id !== selectedShapeId) {
        if (lastShapeSelectedIsBoundingBox) {
          removeHighlightOfListLabel();
          lastShapeSelectedIsBoundingBox = false;
        }
        labelObject = getLabelById(event.target.id);
        newPolygonSelected = true;
      } else {
        newPolygonSelected = false;
      }
      preventActiveObjectsAppearInFront(canvas);
    }
  } else {
    newPolygonSelected = false;
  }
  if ((newPolygonSelected || lastShapeSelectedIsBoundingBox)
    && getRemovingPointsAfterCancelDrawState()) {
    setRemovingPointsAfterCancelDrawState(false);
  }
}

// look at this
function polygonMouseUpEvents(event) {
  mouseIsDown = false;
  if (event.target && event.target.shapeName === 'bndBox') {
    canvas.bringToFront(event.target);
    canvas.bringToFront(labelObject);
  } else if (polygonMoved) {
    highlightLabelInTheList(event.target.id);
    setEditablePolygonWhenPolygonMoved(event);
    canvas.bringToFront(labelObject);
    setLastPolygonActionWasMoveState(true);
  } else if (newPolygonSelected) {
    if (finishedAddingNewPoints) {
      finishedAddingNewPoints = false;
    } else {
      highlightLabelInTheList(event.target.id);
    }
    canvas.bringToFront(event.target);
    setEditablePolygonOnClick(event);
    canvas.bringToFront(labelObject);
  } else if (polygonPointMoved) {
    resetPolygonSelectableAreaAfterPointMoved();
  } else if (event.target && event.target.shapeName === 'polygon') {
    highlightLabelInTheList(event.target.id);
    sendPolygonPointsToFront();
  } else if (!event.target && getPolygonEditingStatus()) {
    removeHighlightOfListLabel();
    setPolygonNotEditableOnClick();
  } else if (selectedShapeId != null || shapeSetToInvisible) {
    removeHighlightOfListLabel();
    shapeSetToInvisible = false;
  }
}


let selectedPoint = null;
// potentially refactor this by assigning individual move functions
function polygonMoveEvents(event) {
  if (event.target) {
    const { shapeName } = event.target;
    if (shapeName === 'polygon') {
      if (getPolygonEditingStatus()) {
        removePolygonPoints();
      }
      labelObject.left = event.target.left - event.target.labelOffsetLeft;
      labelObject.top = event.target.top - event.target.labelOffsetTop;
      polygonMoved = true;
    } else if (shapeName === 'point') {
      if (event.target.pointId === 0) {
        movePolygonPoint(event, labelObject);
      } else {
        movePolygonPoint(event);
      }
      resetPolygonSelectableAreaAfterPointMoved();
      selectedPoint = event.target;
      polygonPointMoved = true;
    } else if (shapeName === 'bndBox') {
      labelObject.left = event.target.left + labelProperies.boundingBoxOffsetProperties().left;
      labelObject.top = event.target.top;
    }
  }
}

// set styling
function shapeMouseOutEvents(event) {
  defaultShapeFill(event.target.id);
}

function shapeMouseOverEvents(event) {
  if (event.target && event.target.shapeName !== 'point' && event.target.shapeName !== 'label') {
    highlightShapeFill(event.target.id);
  }
}

function removeEditedPolygonId() {
  selectedShapeId = null;
}

function setShapeToInvisible() {
  selectedShapeId = null;
  shapeSetToInvisible = true;
}

function setEditPolygonEventObjects(canvasObj, polygonObjId, afterAddPoints) {
  canvas = canvasObj;
  // selected add then remove -> remve will null it
  // selected remove then add -> add will null it
  // selected
  if (polygonObjId !== undefined && polygonObjId !== null) {
    selectedShapeId = polygonObjId;
    labelObject = getLabelById(selectedShapeId);
    highlightLabelInTheList(selectedShapeId);
  }
  if (afterAddPoints) {
    selectedShapeId = null;
    newPolygonSelected = true;
    finishedAddingNewPoints = true;
    lastShapeSelectedIsBoundingBox = false;
    setEditablePolygonOnClick = skipMouseUpEvent;
  } else {
    setEditablePolygonOnClick = setEditablePolygonOnClickFunc;
  }
  setRemovingPointsAfterCancelDrawState(false);
}

function boundingBoxScalingEvents(event) {
  if (event.target.shapeName === 'bndBox') {
    const boundingBox = event.target;
    boundingBox.width *= boundingBox.scaleX;
    boundingBox.height *= boundingBox.scaleY;
    boundingBox.scaleX = 1;
    boundingBox.scaleY = 1;
    labelObject.left = event.target.left + labelProperies.boundingBoxOffsetProperties().left;
    labelObject.top = event.target.top;
  }
}

function getLastSelectedShapeId() {
  return selectedShapeId;
}

let scrollDifference = 0;
let times = 0;

function getScrollWidth() {
  // create a div with the scroll
  const div = document.createElement('div');
  div.style.overflowY = 'scroll';
  div.style.width = '50px';
  div.style.height = '50px';

  // must put it in the document, otherwise sizes will be 0
  document.body.append(div);
  const scrollWidth = div.offsetWidth - div.clientWidth;
  div.remove();
  return scrollWidth * 2;
}

function shapeScrollEvents(event) {
  if (mouseIsDown) {
    if (event.target.shapeName === 'point') {
      const zoomOverflowElement = document.getElementById('zoom-overflow');
      const stubElement = document.getElementById('stub');
      const stubHeight = parseInt(stubElement.style.marginTop.substring(0, stubElement.style.marginTop.length - 2), 10);
      console.log(stubHeight);
      console.log(zoomOverflowElement.offsetHeight);
      console.log(zoomOverflowElement.scrollTop);
      console.log(event.e.deltaY);
      if (zoomOverflowElement.scrollTop + zoomOverflowElement.offsetHeight + event.e.deltaY > stubHeight + getScrollWidth()) {
        console.log('called');
      }
      const yCoordinateDifference = event.target.top - event.transform.lastY;
      if (times < 1) {
        times += 1;
        scrollDifference = yCoordinateDifference;
      }
      event.target.left = canvas.getPointer(event.e).x + (event.e.deltaX / getCurrentZoomState());
      event.target.top = canvas.getPointer(event.e).y + (event.e.deltaY / getCurrentZoomState());
      polygonMoveEvents(event);
    }
  }
}

export {
  polygonMouseDownEvents, polygonMouseUpEvents,
  polygonMoveEvents, removeEditedPolygonId,
  shapeMouseOutEvents, shapeMouseOverEvents,
  setEditPolygonEventObjects, boundingBoxScalingEvents,
  programaticallySelectBoundingBox, setShapeToInvisible,
  programaticallyDeselectBoundingBox, getLastSelectedShapeId,
  shapeScrollEvents,
};
