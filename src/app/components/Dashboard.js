import React, {Component} from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import {Tabs, Tab} from 'material-ui/Tabs';

import muiThemeable from 'material-ui/styles/muiThemeable';
import lightTheme from '../themes/light';

import { Card, CardText } from 'material-ui/Card';
import {Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn}
  from 'material-ui/Table';

import {blue500, lightBlue700, lightBlue900, lightBlue800, green700, red700, white, red50, green500, red500, green50} from 'material-ui/styles/colors';
import IconButton from 'material-ui/IconButton';
import NavigateBefore from 'material-ui/svg-icons/image/navigate-before';
import NavigateNext from 'material-ui/svg-icons/image/navigate-next';
import DateRangeIcon from 'material-ui/svg-icons/action/date-range';
import TrendingDownIcon from 'material-ui/svg-icons/action/trending-down';
import TrendingFlatIcon from 'material-ui/svg-icons/action/trending-flat';
import TrendingUpIcon from 'material-ui/svg-icons/action/trending-up';

import MonthLineGraph from './charts/MonthLineGraph';
import PieGraph from './charts/PieGraph';

import AccountStore from '../stores/AccountStore';
import CurrencyStore from '../stores/CurrencyStore';
import CategoryStore from '../stores/CategoryStore';
import CategoryActions from '../actions/CategoryActions';
import TransactionActions from '../actions/TransactionActions';
import TransactionStore from '../stores/TransactionStore';

let styles = {
  alignRight: {
    textAlign: 'right',
  },
  actions: {
    width: '20px',
  },
  loading: {
    textAlign: 'center',
    padding: '50px 0',
  },
  tabs: {
    rootElement: {
      color: 'black',
      paddingLeft: '20px',
      paddingRight: '20px'
    },
    tabItemContainer: {
      background: 'transparent'
    }
  }
};

class Dashboard extends Component {

  constructor(props, context) {
    super(props, context);
    let now = new Date();
    let year = now.getFullYear();
    if (props.match.params.year) {
       year = parseInt(props.match.params.year);
    }

    this.state = {
      stats: null,
      transactions: null,
      isLoading: true,
      categories: null,
      graph: [],
      trend: [],
      primaryColor: props.muiTheme.palette.primary1Color,
      dateBegin: moment.utc([year]).startOf('year'),
      dateEnd: moment.utc([year]).endOf('year')
    };
    this.history = props.history;
    // Timer is a 300ms timer on read event to let color animation be smooth
    this.timer = null;
  }

  _updateData = (transactions) => {
    if (this.timer) {
      // calculate duration
      const duration = (new Date().getTime()) - this.timer;
      this.timer = null; // reset timer
      if (duration < 350) {
        setTimeout(() => {
          this._performUpdateData(transactions);
        }, 350 - duration);
      } else {
        this._performUpdateData(transactions);
      }
    } else {
      this._performUpdateData(transactions);
    }
  };

  _performUpdateData = (data) => {
    if (data &&
        data.transactions &&
        Array.isArray(data.transactions) &&
        this.state.dateBegin.isSame(data.dateBegin) &&
        this.state.dateEnd.isSame(data.dateEnd)) {

      // Get full year of data
      const year = data.dateBegin.getFullYear();
      let months = {};
      if (data.stats.perDates[year]) {
        months = data.stats.perDates[year].months;
      }

      // Order transactions by date and calculate sum for graph
      let range = n => [...Array(n).keys()]; // [0, ..., ... n-1]

      // Generate Graph data
      let lineExpenses = {
        color: 'red',
        values: []
      };

      let lineIncomes = {
        values: []
      };

      Object.keys(data.stats.perDates).forEach((year) => {
        // For each month of year
        range(12).forEach((month) => {
          if (data.stats.perDates[year].months[month]) {
            lineExpenses.values.push({
              date: new Date(year, month),
              value: +data.stats.perDates[year].months[month].expenses * -1
            });
            lineIncomes.values.push({
              date: new Date(year, month),
              value: data.stats.perDates[year].months[month].incomes
            });
          } else {
            lineExpenses.values.push({ date: new Date(year, month), value: 0 });
            lineIncomes.values.push({ date: new Date(year, month), value: 0 });
          }
        });
      });

      let pie = [];

      console.log(data);

      this.setState({
        isLoading: false,
        transactions: data.transactions,
        stats: data.stats,
        trend: data.trend || [],
        graph: [lineIncomes, lineExpenses],
        perCategories: Object.keys(data.stats.perCategories).map((id) => {
          return {
            id: id,
            name: this.state.categories.find((category) => { return ''+category.id === ''+id; }).name,
            incomes: data.stats.perCategories[id].incomes,
            expenses: data.stats.perCategories[id].expenses
          };
        }).sort((a, b) => {
          return a.expenses > b.expenses ? 1 : -1;
        })
      });
    }
  };

  _goYearBefore = () => {
    this.history.push('/dashboard/'+ moment(this.state.dateBegin).subtract(1, 'year').format('YYYY') +'/');
  };

  _goYearNext = () => {
    this.history.push('/dashboard/'+ moment(this.state.dateEnd).add(1, 'year').format('YYYY') +'/');
  };

  _updateCategories = (categories) => {
    if (categories && Array.isArray(categories)) {
      this.setState({
        categories: categories
      });
    }
  };

  _updateAccount = () => {
    this.setState({
      transactions: null,
      categories: null,
      isLoading: true
    });

    CategoryActions.read();

    TransactionActions.read({
      includeCurrentYear: true,
      includeTrend: true,
      dateBegin: this.state.dateBegin.toDate(),
      dateEnd: this.state.dateEnd.toDate()
    });
  };

  componentWillReceiveProps(nextProps) {
    let year =
      nextProps.match.params.year ?
      parseInt(nextProps.match.params.year) :
      (new Date()).getFullYear();

    const dateBegin = moment.utc(year, 'YYYY').startOf('year');
    const dateEnd = moment.utc(year, 'YYYY').endOf('year');

    this.setState({
      isLoading: true,
      stats : null,
      dateBegin: dateBegin,
      dateEnd: dateEnd,
      primaryColor: nextProps.muiTheme.palette.primary1Color
    });

    TransactionActions.read({
      includeCurrentYear: true,
      includeTrend: true,
      dateBegin: dateBegin.toDate(),
      dateEnd: dateEnd.toDate()
    });
  }

  componentWillMount() {
    AccountStore.addChangeListener(this._updateAccount);
    TransactionStore.addChangeListener(this._updateData);
    CategoryStore.addChangeListener(this._updateCategories);
  }

  componentDidMount() {
    // Timout allow allow smooth transition in navigation
    this.timer = (new Date()).getTime();

    CategoryActions.read();
    TransactionActions.read({
      includeCurrentYear: true,
      includeTrend: true,
      dateBegin: this.state.dateBegin.toDate(),
      dateEnd: this.state.dateEnd.toDate()
    });
  }

  componentWillUnmount() {
    AccountStore.removeChangeListener(this._updateAccount);
    TransactionStore.removeChangeListener(this._updateData);
    CategoryStore.removeChangeListener(this._updateCategories);
  }

  render() {
    return (
      <div key="content">
        <div className="column">

          <div className="triptych">
            <div className="item">
              <h2>This year</h2>
              {
              this.state.isLoading ?
              <div></div>
              :
              <div>
              </div>
              }
            </div>
            <div className="item">
              <h2>Trend on 30 days</h2>
              <div className="wrapper">
              {
                this.state.isLoading ? '' :
                <table style={{width: '100%'}}>
                    <tr>
                      <th></th>
                      <th style={{textAlign: 'center'}} colspan="3">
                        { moment().utc().subtract((30 * 2) + 2, 'days').startOf('day').format('MMM Do') } - { moment().utc().subtract(30 + 2, 'days').endOf('day').format('MMM Do') }
                        <TrendingFlatIcon style={{verticalAlign: 'bottom', padding: '0 8px'}}></TrendingFlatIcon>
                        { moment().utc().subtract(30 + 1, 'days').startOf('day').format('MMM Do')} - {moment().utc().subtract(1, 'days').endOf('day').format('MMM Do') }
                      </th>
                      <th></th>
                    </tr>
                    { this.state.trend.map((trend) => {
                      return (
                        <tr key={trend.id}>
                          <td>{ this.state.categories.find((category) => { return ''+category.id === ''+trend.id; }).name }</td>
                          <td style={{textAlign: 'right'}}>{ CurrencyStore.format(trend.oldiest) }</td>
                          <td style={{textAlign: 'center'}}>
                          { !trend.earliest ? <span style={{color: green500}}><TrendingDownIcon style={{color: green500, verticalAlign: 'bottom', padding: '0 8px'}}></TrendingDownIcon></span> : '' }
                          { trend.earliest && trend.oldiest && trend.diff < 1 ? <span style={{color: green500}}><TrendingDownIcon style={{color: green500, verticalAlign: 'bottom', padding: '0 8px'}}></TrendingDownIcon></span> : '' }
                          { trend.earliest && trend.oldiest && trend.diff == 1 ? <span> <TrendingFlatIcon style={{color: blue500, verticalAlign: 'bottom', padding: '0 8px'}}></TrendingFlatIcon></span> : '' }
                          { trend.earliest && trend.oldiest && trend.diff > 1 ? <span style={{color: red500}}><TrendingUpIcon style={{color: red500, verticalAlign: 'bottom', padding: '0 8px'}}></TrendingUpIcon></span> : '' }
                          { !trend.oldiest ? <span style={{color: red500}}><TrendingUpIcon style={{color: red500, verticalAlign: 'bottom', padding: '0 8px'}}></TrendingUpIcon></span> : '' }
                          </td>
                          <td style={{textAlign: 'left'}}>{ CurrencyStore.format(trend.earliest) }</td>
                          <td style={{textAlign: 'right'}}>
                          { trend.earliest && trend.oldiest && trend.diff < 1 ? <span style={{color: green500}}> - { parseInt((trend.diff - 1) * 100 * -1) }%</span> : '' }
                          { trend.earliest && trend.oldiest && trend.diff == 1 ? <span style={{color: blue500}}> 0%</span> : '' }
                          { trend.earliest && trend.oldiest && trend.diff > 1 ? <span style={{color: red500}}> + { parseInt((trend.diff - 1) * 100) }%</span> : '' }
                          </td>
                        </tr>
                      );
                    }) }
                </table>
              }
              </div>
            </div>
            <div className="item">

            </div>
          </div>

          <div className="monolith stickyDashboard" style={{position: 'sticky', top: '0px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h2><DateRangeIcon style={{width: '38px', height: '36px', verticalAlign: 'middle', marginBottom: '10px', marginRight: '6px'}}></DateRangeIcon>{ this.state.dateBegin.format('MMMM Do, YYYY') } - { this.state.dateEnd.format('MMMM Do, YYYY') }</h2>
            <div>
               <IconButton
                tooltip={moment(this.state.dateBegin, 'YYYY').subtract(1, 'year').format('YYYY')}
                tooltipPosition="bottom-right"
                touch={false}
                iconStyle={{color: 'black'}}
                onTouchTap={this._goYearBefore}><NavigateBefore /></IconButton>
              <IconButton
                tooltip={moment(this.state.dateEnd, 'YYYY').add(1, 'year').format('YYYY')}
                tooltipPosition="bottom-left"
                touch={false}
                iconStyle={{color: 'black'}}
                onTouchTap={this._goYearNext}><NavigateNext /></IconButton>
            </div>
          </div>

          <div className="monolith separator">
            {
              this.state.isLoading ? '' :
              <div style={{fontSize: '1.1em', paddingTop: '10px', paddingBottom: ' 20px'}}>
                <p>Total <strong>income</strong> of <span style={{color: green500}}>{ CurrencyStore.format(this.state.stats.incomes) }</span> for a total of <span style={{color: red500}}>{ CurrencyStore.format(this.state.stats.expenses) }</span> in <strong>expenses</strong>, leaving a <strong>balance</strong> of <span style={{color: blue500}}>{ CurrencyStore.format(this.state.stats.expenses + this.state.stats.incomes) }</span>.</p>
                <p>For this period of <span style={{color: blue500}}>{ this.state.dateEnd.diff(this.state.dateBegin, 'month')+1 }</span> months, <strong>average monthly income</strong> is <span style={{color: green500}}>{ CurrencyStore.format(this.state.stats.incomes / this.state.dateEnd.diff(this.state.dateBegin, 'month')) }</span> and <strong>average monthly expense</strong> is <span style={{color: red500}}>{ CurrencyStore.format(this.state.stats.expenses / this.state.dateEnd.diff(this.state.dateBegin, 'month')) }</span>.</p>
              </div>
            }
          </div>

          <div className="monolith separator">
            <div style={{ width: '100%' }}>
              <div style={{ height: '50vh' }}>
                <MonthLineGraph values={this.state.graph} />
              </div>
            </div>
          </div>

          <div className="camembert">
            <div className="item">
              {
                this.state.isLoading ?
                <div style={styles.loading}>
                </div>
                :
                <PieGraph values={this.state.perCategories}></PieGraph>
              }
            </div>
            <div className="item">
              {
                this.state.isLoading ?
                <div style={styles.loading}>
                </div>
                :
                <Card className="card">
                  <Table style={{background: 'none'}}>
                    <TableHeader
                      displaySelectAll={false}
                      adjustForCheckbox={false}>
                      <TableRow>
                        <TableHeaderColumn></TableHeaderColumn>
                        <TableHeaderColumn style={styles.amount}>Expenses</TableHeaderColumn>
                      </TableRow>
                    </TableHeader>
                    <TableBody
                      displayRowCheckbox={false}
                      showRowHover={true}
                      stripedRows={false}
                    >
                    { this.state.perCategories.map((item) => {
                      return (
                        <TableRow key={item.id}>
                          <TableRowColumn>{ this.state.categories.find((category) => { return ''+category.id === ''+item.id; }).name }</TableRowColumn>
                          <TableRowColumn style={styles.amount}>{ CurrencyStore.format(item.expenses) }</TableRowColumn>
                        </TableRow>
                      );
                    })
                    }
                    </TableBody>
                  </Table>
                </Card>
              }
            </div>
          </div>

          <div className="row padding" style={{padding: '0px 0px 20px 0'}}>
            <div className="thirdWidth">
            </div>
            <div className="thirdWidth">
            </div>
            <div className="thirdWidth">

            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default muiThemeable()(Dashboard);
