import moment from "moment";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { makeStyles } from "@material-ui/core/styles";
import { useRouter } from "../../router";

import List from "@material-ui/core/List";
import ListSubheader from "@material-ui/core/ListSubheader";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";

import Modal from "@material-ui/core/Modal";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import CardActions from "@material-ui/core/CardActions";

import Button from "@material-ui/core/Button";
import Divider from "@material-ui/core/Divider";
import RefreshIcon from "@material-ui/icons/Refresh";
import DeleteForeverIcon from "@material-ui/icons/DeleteForever";
import KeyboardArrowRight from "@material-ui/icons/KeyboardArrowRight";

import Switch from "@material-ui/core/Switch";

import UserActions from "../../actions/UserActions";
import AccountsActions from "../../actions/AccountsActions";
import AppActions from "../../actions/AppActions";

const useStyles = makeStyles(theme => ({
  card: {
    position: "absolute",
    top: 40,
    left: 40,
    right: 40,
    bottom: 40,
    display: "flex",
    flexDirection: "column"
  }
}));

export default function ServerSettings() {
  const dispatch = useDispatch();
  const classes = useStyles();

  const { history } = useRouter();

  const token = useSelector(state => state.user.token);
  const server = useSelector(state => state.server);
  const account = useSelector(state => state.account);
  const last_sync = useSelector(state => state.server.last_sync);
  const last_edited = useSelector(state => state.server.last_edited);

  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSync, setAutoSync] = useState(
    account.preferences ? account.preferences.autoSync : false
  );
  const [terms_and_conditions_date] = moment(
    server.terms_and_conditions_date,
    "YYYY-MM-DD"
  ).format("MMMM Do,YYYY");

  const _toggleAutoSync = () => {
    if (!isLoading) {
      setIsLoading(true);
      dispatch(AccountsActions.setPreferences({ autoSync: !autoSync }))
        .then(() => {
          setAutoSync(!autoSync);
        })
        .catch(error => {
          console.error(error);
          dispatch(
            AppActions.snackbar(
              "Can't access server to updated sync preferences"
            )
          );
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  };

  const _toggleTermsAndCondition = () => {
    setOpen(!open);
  };

  const _revokePassword = () => {
    dispatch(UserActions.revokeToken())
      .then(() => {
        history.replace("/logout");
      })
      .catch(error => {
        console.error(error);
      });
  };

  return (
    <div
      className="layout_content wrapperMobile"
      subheader={
        <ListSubheader disableSticky={true}>Authentication</ListSubheader>
      }
    >
      <List>
        <ListItem>
          <ListItemText primary="Name" secondary={server.name} />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="API Version"
            secondary={server["api_version"].join(".")}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="Administrator email"
            secondary={server.contact || "Not defined"}
          />
        </ListItem>

        <ListItem button onClick={_toggleTermsAndCondition}>
          <ListItemText
            primary="Terms and conditions"
            secondary={
              server.terms_and_conditions
                ? `Published on ${terms_and_conditions_date}`
                : "NA"
            }
          />
          <KeyboardArrowRight />
        </ListItem>
        <ListItem button onClick={_toggleAutoSync} disabled={isLoading}>
          <ListItemText
            primary="Auto sync"
            secondary="Push modifications on each edit"
          />
          <ListItemSecondaryAction>
            <Switch
              checked={autoSync}
              onChange={_toggleAutoSync}
              color="primary"
              disabled={isLoading}
              inputProps={{ "aria-label": "primary checkbox" }}
            />
          </ListItemSecondaryAction>
        </ListItem>

        <ListItem>
          <ListItemText
            primary="Last sync"
            secondary={moment(last_sync).fromNow()}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="Last modification"
            secondary={moment(last_edited).fromNow()}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="Sign in"
            secondary={server.allow_account_creation ? "Enable" : "Disable"}
          />
        </ListItem>
        <ListItem>
          <ListItemText primary="Authentication Token" secondary={token} />
        </ListItem>
        <Divider />
        <ListItem button onClick={_revokePassword}>
          <ListItemIcon>
            <DeleteForeverIcon />
          </ListItemIcon>
          <ListItemText
            primary="Revoke Token"
            secondary="Delete the token and logout"
          />
        </ListItem>
      </List>

      <Modal
        aria-labelledby="simple-modal-title"
        aria-describedby="simple-modal-description"
        open={open}
        onClose={_toggleTermsAndCondition}
      >
        <Card className={classes.card}>
          <CardHeader
            title="Terms and conditions"
            subheader="Terms and condition are defined by the hosting platform, and can be
            different for every instance."
          />
          <CardContent style={{ overflow: "auto", flexShrink: 1, flexGrow: 1 }}>
            {server.terms_and_conditions ? (
              <div>
                <h3>
                  Publised on{" "}
                  {moment(
                    server.terms_and_conditions_date,
                    "YYYY-MM-DD"
                  ).format("MMMM Do,YYYY")}
                </h3>
                <div
                  dangerouslySetInnerHTML={{
                    __html: server.terms_and_conditions
                  }}
                />
              </div>
            ) : (
              <p>This server has no terms and conditions defined.</p>
            )}
          </CardContent>
          <CardActions
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "10px 20px"
            }}
          >
            <Button onClick={_toggleTermsAndCondition}>Close</Button>
          </CardActions>
        </Card>
      </Modal>
    </div>
  );
}
