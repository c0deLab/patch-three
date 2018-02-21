import React, { Component } from 'react';

import './Controls.css';

class ControlsManager {

  events: Array<>;
  
  constructor() {
    this.events = [];
  }

  on(name: string, callback: Function) {
    console.log('added on', name, 'listener');
    this.events.push({
      name,
      callback
    });
  }

  trigger(name) {
    const events = this.events.filter(e => e.name === name);
    events.forEach(e => e.callback());
  }
}

export default class Controls extends Component {

  render() {

    const manager = this.props.manager;
    const trigger = name => manager.trigger.bind(manager, name);

    return (
      <div className="controls">
        <button onClick={trigger('morph')}>Morph</button>
        <button onClick={trigger('restore')}>Restore</button>
      </div>
    );
  }
};

export {
  Controls,
  ControlsManager
};