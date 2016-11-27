import React, {Component} from 'react';

import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import CircularProgress from 'material-ui/CircularProgress';
import {Card, CardText} from 'material-ui/Card';

import UserActions from '../../actions/UserActions';
import UserStore from '../../stores/UserStore';

const styles = {
  container: {
    textAlign: 'center',
  },
  h1: {
    padding: '30px 10px 0px 0px',
    margin: '0',
    textAlign: 'center',
  },
  connect: {
    margin: '20px 0px 0px 150px',
  },
};

class LoginForm extends Component {

  constructor(props, context) {
    super(props, context);
    this.context = context;
    this.state = {
      loading: false,
      error: {},
      username: '',
      password: '',
      nextPathname: props.location.state ? props.location.state.nextPathname : '/',
    };
  }

  handleChangeUsername = (event) => {
    this.setState({username: event.target.value});
  };

  handleChangePassword = (event) => {
    this.setState({password: event.target.value});
  };

  handleSubmit = (e) => {
    e.preventDefault();

    // Start animation during login process
    this.setState({
      loading: true,
    });

    let self = this;

    // Wait for login return event
    UserStore.onceChangeListener((args) => {
      if (args) {
        self.setState({
          loading: false,
          error: {
            username: args.username || args.non_field_errors,
            password: args.password || args.non_field_errors,
          }
        });
      } else {
        self.context.router.replace(self.state.nextPathname);
      }
    });

     // Send login action
    UserActions.login(this.state.username, this.state.password);
  };

  render() {
    return (
      <Card style={styles.container}>
        <CardText expandable={false}>
        { this.state.loading
          ?
          <div className="flexboxContainer">
            <div className="flexbox">
              <CircularProgress size={80} />
            </div>
          </div>
          :
          <form onSubmit={e => this.handleSubmit(e)} >
            <TextField
              floatingLabelText="Username"
              value={this.state.username}
              errorText={this.state.error.username}
              onChange={this.handleChangeUsername}
            /><br />
            <TextField
              floatingLabelText="Password"
              type="password"
              value={this.state.password}
              errorText={this.state.error.password}
              onChange={this.handleChangePassword}
            /><br/>
            <RaisedButton
              label="Connect"
              type="submit"
              primary={true}
              style={styles.connect} />
          </form>
        }
        </CardText>
      </Card>
    );
  }
}

// Inject router in context
LoginForm.contextTypes = {
  router: React.PropTypes.object.isRequired
};

export default LoginForm;