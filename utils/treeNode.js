// Based on: Closure Library TreeNode

// Copyright 2010 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// available functions:
// clone()
// deepClone()
// getParent()
// isLeaf()
// getChildren()
// getChildAt()
// getChildCount()
// getDepth()
// getAncestors()
// getRoot()
// getSubtreeKeys()
// contains()
// findCommonAncestor()

// setParent()
// addChild()
// addChildAt()
// replaceChildAt()
// replaceChild()
// removeChildAt()
// removeChild()
// removeChildren()

// forEachChild()
// forEachDescendant()
// traverse()


TreeNode = function(key, value) {
  this.key = key;
  this.value = value;
};
TreeNode.EMPTY_ARRAY_ = [];
TreeNode.prototype.parent_ = null;
TreeNode.prototype.children_ = null;

 // FIXED: simplified goog.array functions
 // TODO: make it carefully
googarray = function() {};
googarray.indexOf = function(arr, obj, opt_fromIndex) {
  var fromIndex = opt_fromIndex == null ?
      0 : (opt_fromIndex < 0 ?
           Math.max(0, arr.length + opt_fromIndex) : opt_fromIndex);

  for (var i = fromIndex; i < arr.length; i++) {
    if (i in arr && arr[i] === obj)
      return i;
  }
  return -1;
}; 


googarray.forEach = function(arr, f, opt_obj) {
  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = arr;
  for (var i = 0; i < l; i++) {
    if (i in arr2) {
      f.call(opt_obj, arr2[i], i, arr);
    }
  }
};

googarray.insertAt = function(arr, obj, opt_i) {
  arr.splice(opt_i, 0, obj);
};

googarray.removeAt = function (arr, i) {
    arr.splice(i, 1);
};


/**
 * @return {!goog.structs.TreeNode} Clone of the tree node without its parent
 *     and child nodes. The key and the value are copied by reference.
 * @override
 */
TreeNode.prototype.clone = function() {
  return new TreeNode(this.getKey(), this.getValue());
};


/**
 * @return {!goog.structs.TreeNode} Clone of the subtree with this node as root.
 */
TreeNode.prototype.deepClone = function() {
  var clone = this.clone();
  this.forEachChild(function(child) {
    clone.addChild(child.deepClone());
  });
  return clone;
};


/**
 * @return {goog.structs.TreeNode} Parent node or null if it has no parent.
 */
TreeNode.prototype.getParent = function() {
  return this.parent_;
};


/**
 * @return {boolean} Whether the node is a leaf node.
 */
TreeNode.prototype.isLeaf = function() {
  return !this.getChildCount();
};


/**
 * @return {!Array.<!goog.structs.TreeNode>} Immutable child nodes.
 */
TreeNode.prototype.getChildren = function() {
  return this.children_ || TreeNode.EMPTY_ARRAY_;
};


/**
 * Gets the child node of this node at the given index.
 * @param {number} index Child index.
 * @return {goog.structs.TreeNode} The node at the given index or null if not
 *     found.
 */
TreeNode.prototype.getChildAt = function(index) {
  return this.getChildren()[index] || null;
};


/**
 * @return {number} The number of children.
 */
TreeNode.prototype.getChildCount = function() {
  return this.getChildren().length;
};


/**
 * @return {number} The number of ancestors of the node.
 */
TreeNode.prototype.getDepth = function() {
  var depth = 0;
  var node = this;
  while (node.getParent()) {
    depth++;
    node = node.getParent();
  }
  return depth;
};


/**
 * @return {!Array.<!goog.structs.TreeNode>} All ancestor nodes in bottom-up
 *     order.
 */
TreeNode.prototype.getAncestors = function() {
  var ancestors = [];
  var node = this.getParent();
  while (node) {
    ancestors.push(node);
    node = node.getParent();
  }
  return ancestors;
};


/**
 * @return {!goog.structs.TreeNode} The root of the tree structure, i.e. the
 *     farthest ancestor of the node or the node itself if it has no parents.
 */
TreeNode.prototype.getRoot = function() {
  var root = this;
  while (root.getParent()) {
    root = root.getParent();
  }
  return root;
};


/**
 * Builds a nested array structure from the node keys in this node's subtree to
 * facilitate testing tree operations that change the hierarchy.
 * @return {!Array} The structure of this node's descendants as nested array
 *     of node keys. The number of unclosed opening brackets up to a particular
 *     node is proportional to the indentation of that node in the graphical
 *     representation of the tree. Example:
 *     <pre>
 *       this
 *       |- child1
 *       |  L- grandchild
 *       L- child2
 *     </pre>
 *     is represented as ['child1', ['grandchild'], 'child2'].
 */
TreeNode.prototype.getSubtreeKeys = function() {
  var ret = [];
  this.forEachChild(function(child) {
    ret.push(child.getKey());
    if (!child.isLeaf()) {
      ret.push(child.getSubtreeKeys());
    }
  });
  return ret;
};


/**
 * Tells whether this node is the ancestor of the given node.
 * @param {!goog.structs.TreeNode} node A node.
 * @return {boolean} Whether this node is the ancestor of {@code node}.
 */
TreeNode.prototype.contains = function(node) {
  var current = node;
  do {
    current = current.getParent();
  } while (current && current != this);
  return Boolean(current);
};


/**
 * Finds the deepest common ancestor of the given nodes. The concept of
 * ancestor is not strict in this case, it includes the node itself.
 * @param {...!goog.structs.TreeNode} var_args The nodes.
 * @return {goog.structs.TreeNode} The common ancestor of the nodes or null if
 *     they are from different trees.
 */
TreeNode.findCommonAncestor = function(var_args) {
  var ret = arguments[0];
  if (!ret) {
    return null;
  }

  var retDepth = ret.getDepth();
  for (var i = 1; i < arguments.length; i++) {
    var node = arguments[i];
    var depth = node.getDepth();
    while (node != ret) {
      if (depth <= retDepth) {
        ret = ret.getParent();
        retDepth--;
      }
      if (depth > retDepth) {
        node = node.getParent();
        depth--;
      }
    }
  }

  return ret;
};


/**
 * Traverses all child nodes.
 * @param {function(!goog.structs.TreeNode, number,
 *     !Array.<!goog.structs.TreeNode>)} f Callback function. It takes the
 *     node, its index and the array of all child nodes as arguments.
 * @param {Object=} opt_this The object to be used as the value of {@code this}
 *     within {@code f}.
 */
TreeNode.prototype.forEachChild = function(f, opt_this) {
  googarray.forEach(this.getChildren(), f, opt_this);
};


/**
 * Traverses all child nodes recursively in preorder.
 * @param {function(!goog.structs.TreeNode)} f Callback function. It takes the
 *     node as argument.
 * @param {Object=} opt_this The object to be used as the value of {@code this}
 *     within {@code f}.
 */
TreeNode.prototype.forEachDescendant = function(f, opt_this) {
  googarray.forEach(this.getChildren(), function(child) {
    f.call(opt_this, child);
    child.forEachDescendant(f, opt_this);
  });
};


/**
 * Traverses the subtree with the possibility to skip branches. Starts with
 * this node, and visits the descendant nodes depth-first, in preorder.
 * @param {function(!goog.structs.TreeNode): (boolean|undefined)} f Callback
 *     function. It takes the node as argument. The children of this node will
 *     be visited if the callback returns true or undefined, and will be
 *     skipped if the callback returns false.
 * @param {Object=} opt_this The object to be used as the value of {@code this}
 *     within {@code f}.
 */
TreeNode.prototype.traverse = function(f, opt_this) {
  if (f.call(opt_this, this) !== false) {
    googarray.forEach(this.getChildren(), function(child) {
      child.traverse(f, opt_this);
    });
  }
};

// FIXED:
// returns the first node, where f(node) == true
TreeNode.prototype.find = function (f, opt_this) {
    var found = null;

    this.traverse(function (node) {
        if (found !== null)
            return false;

        if (f.call(opt_this, node) === true) {
            found = node;
            return false;
        }

        return true;
    }, this);

    return found;
};


TreeNode.prototype.path = function () {
    var path = [];

    path.push(this);
    var root = this;

    while (root.getParent()) {
        root = root.getParent();
        path.push(root)
    }
    return root;
};

/**
 * Sets the parent node of this node. The callers must ensure that the parent
 * node and only that has this node among its children.
 * @param {goog.structs.TreeNode} parent The parent to set. If null, the node
 *     will be detached from the tree.
 * @protected
 */
TreeNode.prototype.setParent = function(parent) {
  this.parent_ = parent;
};


/**
 * Appends a child node to this node.
 * @param {!goog.structs.TreeNode} child Orphan child node.
 */
TreeNode.prototype.addChild = function(child) {
  this.addChildAt(child, this.children_ ? this.children_.length : 0);
};


/**
 * Inserts a child node at the given index.
 * @param {!goog.structs.TreeNode} child Orphan child node.
 * @param {number} index The position to insert at.
 */
TreeNode.prototype.addChildAt = function(child, index) {
  // goog.asserts.assert(!child.getParent());
  child.setParent(this);
  this.children_ = this.children_ || [];

  // goog.asserts.assert(index >= 0 && index <= this.children_.length);
  googarray.insertAt(this.children_, child, index);
};


/**
 * Replaces a child node at the given index.
 * @param {!goog.structs.TreeNode} newChild Child node to set. It must not have
 *     parent node.
 * @param {number} index Valid index of the old child to replace.
 * @return {!goog.structs.TreeNode} The original child node, detached from its
 *     parent.
 */
TreeNode.prototype.replaceChildAt = function(newChild, index) {
  // goog.asserts.assert(!newChild.getParent(),
  //     'newChild must not have parent node');
  var children = this.getChildren();
  var oldChild = children[index];
  // goog.asserts.assert(oldChild, 'Invalid child or child index is given.');
  oldChild.setParent(null);
  children[index] = newChild;
  newChild.setParent(this);
  return oldChild;
};


/**
 * Replaces the given child node.
 * @param {!goog.structs.TreeNode} newChild New node to replace
 *     {@code oldChild}. It must not have parent node.
 * @param {!goog.structs.TreeNode} oldChild Existing child node to be replaced.
 * @return {!goog.structs.TreeNode} The replaced child node detached from its
 *     parent.
 */
TreeNode.prototype.replaceChild = function(newChild, oldChild) {
  return this.replaceChildAt(newChild,
      googarray.indexOf(this.getChildren(), oldChild));
};


/**
 * Removes the child node at the given index.
 * @param {number} index The position to remove from.
 * @return {goog.structs.TreeNode} The removed node if any.
 */
TreeNode.prototype.removeChildAt = function(index) {
  var child = this.children_ && this.children_[index];
  if (child) {
    child.setParent(null);
    googarray.removeAt(this.children_, index);
    if (this.children_.length == 0) {
      delete this.children_;
    }
    return child;
  }
  return null;
};


/**
 * Removes the given child node of this node.
 * @param {goog.structs.TreeNode} child The node to remove.
 * @return {goog.structs.TreeNode} The removed node if any.
 */
TreeNode.prototype.removeChild = function(child) {
  return this.removeChildAt(googarray.indexOf(this.getChildren(), child));
};


/**
 * Removes all child nodes of this node.
 */
TreeNode.prototype.removeChildren = function() {
  if (this.children_) {
    googarray.forEach(this.children_, function(child) {
      child.setParent(null);
    });
  }
  delete this.children_;
};