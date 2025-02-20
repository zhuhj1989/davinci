/*
 * <<
 * Davinci
 * ==
 * Copyright (C) 2016 - 2017 EDP
 * ==
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * >>
 */

import React from 'react'
import Animate from 'rc-animate'
import classnames from 'classnames'

import DashboardItemControlPanel from './DashboardItemControlPanel'
import DashboardItemControlForm from './DashboardItemControlForm'
import DashboardItemMask from './DashboardItemMask'
import SharePanel from '../../../components/SharePanel'
import DownloadCsv, { IDownloadCsvProps } from '../../../components/DownloadCsv'
import DataDrill from '../../../components/DataDrill/Panel'
import DataDrillHistory from '../../../components/DataDrill/History'
import { IFormedView, IViewModel } from 'containers/View/types'

import Widget, { IWidgetConfig, IPaginationParams, RenderType } from '../../Widget/components/Widget'
import { ChartTypes } from '../../Widget/config/chart/ChartTypes'
import { IconProps } from 'antd/lib/icon'
import { Icon, Tooltip, Popconfirm, Popover, Dropdown, Menu } from 'antd'

import ModulePermission from '../../Account/components/checkModulePermission'
import ShareDownloadPermission from '../../Account/components/checkShareDownloadPermission'
import { IProject } from '../../Projects'
import { IQueryConditions, IQueryVariableMap } from '../Grid'
import { IMapControlOptions, OnGetControlOptions, IDistinctValueReqeustParams } from 'app/components/Filters'
const styles = require('../Dashboard.less')
const utilStyles = require('../../../assets/less/util.less')

interface IDashboardItemProps {
  itemId: number
  widget: any
  widgets: any
  view?: Partial<IFormedView>
  datasource: any
  loading: boolean
  polling: string
  interacting: boolean
  frequency: string
  shareInfo: string
  secretInfo?: string
  shareInfoLoading?: boolean
  downloadCsvLoading: boolean
  drillHistory?: any
  drillpathSetting?: any
  drillpathInstance?: any
  rendered?: boolean
  renderType: RenderType
  controlSelectOptions: IMapControlOptions
  selectedItems: number[]
  currentProject?: IProject
  queryConditions: IQueryConditions
  container?: string
  onSelectDrillHistory?: (history?: any, item?: number, itemId?: number, widgetId?: number) => void
  onGetChartData: (renderType: RenderType, itemId: number, widgetId: number, queryConditions?: any) => void
  onShowEdit?: (itemId: number) => (e: React.MouseEvent<HTMLSpanElement>) => void
  onShowDrillEdit?: (itemId: number) => (e: React.MouseEvent<HTMLSpanElement>) => void
  onDeleteDashboardItem?: (itemId: number) => () => void
  onLoadWidgetShareLink?: (id: number, itemId: number, authName: string) => void
  onDownloadCsv: (itemId: number, widgetId: number, shareInfo?: string) => void
  onTurnOffInteract: (itemId: number) => void
  onShowFullScreen: (chartData: any) => void
  onCheckTableInteract: (itemId: number) => boolean
  onDoTableInteract: (itemId: number, triggerData: object) => void
  onEditWidget?: (itemId: number, widgetId: number) => void
  onDrillData?: (e: object) => void
  onDrillPathData?: (e: object) => void
  onSelectChartsItems?: (itemId: number, renderType: string, selectedItems: number[]) => void
  onGetControlOptions: OnGetControlOptions
}

interface IDashboardItemStates {
  controlPanelVisible: boolean
  sharePanelAuthorized: boolean
  widgetProps: IWidgetConfig
  pagination: IPaginationParams
  queryVariables: IQueryVariableMap
  nativeQuery: boolean
  model: IViewModel
  isDrilling: boolean
  dataDrillPanelPosition: boolean | object
  whichDataDrillBrushed: boolean | object []
  sourceDataOfBrushed: boolean | object []
  // isShowDrillPanel: boolean
  cacheWidgetProps: IWidgetConfig
  cacheWidgetId: boolean | number
}

export class DashboardItem extends React.PureComponent<IDashboardItemProps, IDashboardItemStates> {
  constructor (props) {
    super(props)
    this.state = {
      controlPanelVisible: false,
      sharePanelAuthorized: false,
      widgetProps: null,
      pagination: null,
      queryVariables: {},
      nativeQuery: false,
      model: null,
      isDrilling: true,
      dataDrillPanelPosition: false,
      whichDataDrillBrushed: false,
      sourceDataOfBrushed: false,
      cacheWidgetProps: null,
      cacheWidgetId: false
      //   isShowDrillPanel: true
    }
  }

  public static defaultProps = {
    onShowEdit: () => void 0,
    onShowDrillEdit: () => void 0,
    onDeleteDashboardItem: () => void 0
  }
  private pollingTimer: number
  private container: HTMLDivElement = null

  public componentWillMount () {
    const { itemId, widget, view, onGetChartData, container, datasource } = this.props
    const { cacheWidgetProps, cacheWidgetId } = this.state
    const widgetProps = JSON.parse(widget.config)
    const { autoLoadData } = widgetProps
    const pagination = this.getPagination(widgetProps, datasource)
    const nativeQuery = this.getNativeQuery(widgetProps)
    if (container === 'share') {
      if (autoLoadData === true || autoLoadData === undefined) {
        onGetChartData('clear', itemId, widget.id, { pagination, nativeQuery })
      }
      this.initPolling(this.props)
    }
    this.setState({
      widgetProps,
      pagination,
      nativeQuery,
      model: view.model
    })
    if (!cacheWidgetProps) {
      this.setState({
        cacheWidgetProps: {...widgetProps},
        cacheWidgetId: widget.id
      })
    }
  }

  public componentWillReceiveProps (nextProps: IDashboardItemProps) {
    const { widget, queryConditions, renderType } = this.props
    let { widgetProps, pagination, model } = this.state

    if (nextProps.widget !== widget) {
      widgetProps = JSON.parse(nextProps.widget.config)
      model = nextProps.view.model
      this.setState({
        widgetProps,
        model
      })
    }

    if (nextProps.queryConditions !== queryConditions) {
      const { variables, linkageVariables, globalVariables } = nextProps.queryConditions
      this.setState({
        queryVariables: [...variables, ...linkageVariables, ...globalVariables]
          .reduce((obj, { name, value }) => {
            obj[`$${name}$`] = value
            return obj
          }, {})
      })
    }

    pagination = this.getPagination(widgetProps, nextProps.datasource)
    this.setState({
      pagination
    })
  }

  public componentWillUpdate (nextProps: IDashboardItemProps, nextState: IDashboardItemStates) {
    const {
      itemId,
      widget,
      polling,
      frequency,
      onGetChartData,
      rendered,
      container
    } = nextProps
    const { pagination, nativeQuery } = this.state
    const { autoLoadData } = nextState.widgetProps
    if (!container) {
      if (!this.props.rendered && rendered) {
        // clear
        if (autoLoadData === true || autoLoadData === undefined) {
          onGetChartData('clear', itemId, widget.id, { pagination, nativeQuery })
        }
        this.initPolling(this.props)
      }
    }

    if (polling !== this.props.polling || frequency !== this.props.frequency) {
      this.initPolling(nextProps)
    }
  }

  public componentWillUnmount () {
    clearInterval(this.pollingTimer)
  }

  // @FIXME need refactor
  private getPagination = (widgetProps: IWidgetConfig, datasource) => {
    const { chartStyles } = widgetProps
    const { table } = chartStyles
    if (!table) { return null }

    const { withPaging, pageSize } = table
    const pagination: IPaginationParams = {
      withPaging,
      pageSize: 0,
      pageNo: 0,
      totalCount: datasource.totalCount || 0
    }
    if (pagination.withPaging) {
      pagination.pageSize = datasource.pageSize || +pageSize
      pagination.pageNo = datasource.pageNo || 1
    }
    return pagination
  }

  private getNativeQuery = (widgetProps: IWidgetConfig) => {
    let noAggregators = false
    const { chartStyles } = widgetProps
    const { table } = chartStyles
    if (table) {
      noAggregators = table.withNoAggregators
    }
    return noAggregators
  }

  private initPolling = (props: IDashboardItemProps) => {
    const {
      polling,
      frequency,
      itemId,
      widget,
      onGetChartData
    } = props

    clearInterval(this.pollingTimer)

    if (polling) {
      const { pagination, nativeQuery } = this.state
      this.pollingTimer = window.setInterval(() => {
        onGetChartData('refresh', itemId, widget.id, { pagination, nativeQuery })
      }, Number(frequency) * 1000)
    }
  }

  private onSyncBizdatas = () => {
    const {
      itemId,
      widget,
      onGetChartData
    } = this.props
    const { pagination, nativeQuery } = this.state
    onGetChartData('refresh', itemId, widget.id, { pagination, nativeQuery })
  }

  private onControlSearch = (queryConditions: Partial<IQueryConditions>) => {
    const {
      itemId,
      widget,
      onGetChartData
    } = this.props
    const { pagination, nativeQuery } = this.state
    onGetChartData('clear', itemId, widget.id, { ...queryConditions, pagination, nativeQuery })
  }

  private toggleControlPanel = () => {
    this.setState({
      controlPanelVisible: !this.state.controlPanelVisible
    })
  }

  private onFullScreen = () => {
    const {
      onShowFullScreen,
      itemId,
      widget,
      loading,
      renderType,
      onGetChartData
    } = this.props

    if (onShowFullScreen) {
      onShowFullScreen({
        itemId,
        widget,
        model: this.state.model,
        loading,
        renderType,
        onGetChartData
      })
    }
  }

  private downloadCsv = () => {
    const { widget, itemId, shareInfo, onDownloadCsv } = this.props
    onDownloadCsv(itemId, widget.id, shareInfo)
  }

  private changeSharePanelAuthorizeState = (state) => () => {
    this.setState({
      sharePanelAuthorized: state
    })
  }

  private checkTableInteract = () => {
    const { itemId, onCheckTableInteract } = this.props
    return onCheckTableInteract(itemId)
  }

  private doInteract = (triggerData) => {
    const { itemId, onDoTableInteract } = this.props
    onDoTableInteract(itemId, triggerData)
  }

  private paginationChange = (pageNo: number, pageSize: number) => {
    const { onGetChartData, itemId, widget } = this.props
    let { pagination } = this.state
    const { nativeQuery } = this.state
    pagination = {
      ...pagination,
      pageNo,
      pageSize
    }
    onGetChartData('clear', itemId, widget.id, { pagination, nativeQuery })
  }

  private turnOffInteract = () => {
    const { onTurnOffInteract, itemId } = this.props
    onTurnOffInteract(itemId)
  }

  private doDrill = () => {
    const {cacheWidgetProps} = this.state
    this.setState({isDrilling: !this.state.isDrilling}, () => {
      const { onSelectDrillHistory, itemId, widget, onGetChartData } = this.props
      onSelectDrillHistory(false, -1, itemId, widget.id)
      this.setState({widgetProps: cacheWidgetProps}, () => onGetChartData('rerender', itemId, widget.id))
      if (!this.state.isDrilling) {
        this.setState({whichDataDrillBrushed: false})
      }
    })
  }

  private toWorkbench = () => {
    const { itemId, widget } = this.props
    this.props.onEditWidget(itemId, widget.id)
  }

  private getDataDrillDetail = (position) => {
    if (position && position.length) {
      try {
        const ps = JSON.parse(position)
        const {range, brushed, sourceData} = ps
        const dataDrillPanelPosition = void 0
        const sourceDataOfBrushed = sourceData && sourceData.length ? sourceData : void 0
        const whichDataDrillBrushed = brushed && brushed.length ? brushed : void 0
        this.setState({
          dataDrillPanelPosition,
          whichDataDrillBrushed,
          sourceDataOfBrushed
        })
      } catch (error) {
        throw error
      }
    }
  }

  private drillDataHistory = (history, item, itemId, widgetId) => {
    const {onSelectDrillHistory, drillHistory, widget, onGetChartData} = this.props
    const { widgetProps, cacheWidgetProps } = this.state
    const wid = !history && item > -1 ? widgetId : this.state.cacheWidgetId
    if (onSelectDrillHistory) {
      const historyGroups = history ? drillHistory[item]['groups'] : []
      const historyCols = history && drillHistory[item]['col'] ? drillHistory[item]['col'] : cacheWidgetProps.cols
      const historyRows = history && drillHistory[item]['row'] ? drillHistory[item]['row'] : cacheWidgetProps.rows
      if (drillHistory && drillHistory[item] && drillHistory[item]['widgetConfig']) {
        const dw = drillHistory[item].widgetConfig
        this.setState({
          widgetProps: dw
        })
        onSelectDrillHistory(history, item, itemId, wid)
        return
      }
      if (widgetProps.dimetionAxis) {
        if (widgetProps.dimetionAxis === 'col') {
          this.setState({
            widgetProps: {
              ...widgetProps,
              ...{
                cols: historyGroups && historyGroups.length ? historyGroups.map((history) => ({name: history})) : cacheWidgetProps.cols
              }
            }
          })
        } else if (widgetProps.dimetionAxis === 'row') {
          this.setState({
            widgetProps: {
              ...widgetProps,
              ...{
                rows: historyGroups && historyGroups.length ? historyGroups.map((history) => ({name: history})) : cacheWidgetProps.rows
              }
            }
          })
        } else {
          this.setState({
            widgetProps: {
              ...widgetProps,
              ...{
                cols: historyCols,
                rows: historyRows
              }
            }
          })
        }
      } else {
        this.setState({
          widgetProps: {
            ...widgetProps,
            ...{
              cols: historyCols,
              rows: historyRows
            }
          }
        })
      }
      if (item === -1 && !history) {
        this.setState({widgetProps: {...this.state.cacheWidgetProps}})
      }
      onSelectDrillHistory(history, item, itemId, wid)
    }
  }
  private drillpathData = () => {
    // todo
    // 由于前端拿不到全量数据，所以在model中选取的没有数值的纬度列，可能会导致filter不合法的情况。
    const { whichDataDrillBrushed, sourceDataOfBrushed } = this.state
    const { drillpathInstance, drillpathSetting, drillHistory, itemId, widgets, onDrillPathData, onGetChartData } = this.props
    let out = void 0
    let enter = void 0
    let widget = void 0
    let prevDrillHistory = void 0
    if (!drillHistory || (drillHistory && drillHistory.length === 0)) {
      out = drillpathSetting[0]['out']
      enter = drillpathSetting[1]['enter']
      widget = drillpathSetting[1]['widget']
    } else if (drillpathSetting && drillpathSetting.length > 2) {
      prevDrillHistory = drillHistory[drillHistory.length - 1]
      const currentItem = drillHistory.length + 1
      out = drillpathSetting[currentItem - 1]['out']
      widget = drillpathSetting[currentItem]['widget']
      enter = drillpathSetting[currentItem]['enter']
    }
    const value = (sourceDataOfBrushed as object[]).map((source) => {
      return source[out]
    })
    const nextWidget = widgets.find((w) => w.id === Number(widget))
    const widgetProps = JSON.parse(nextWidget.config)
    const sql = `${enter} in (${value.map((key) => `'${key}'`).join(',')})`
    let sqls = widgetProps.filters.map((i) => i.config.sql)
    sqls.push(sql)
    if (prevDrillHistory && prevDrillHistory.filter.sqls) {
      const prevSqls = prevDrillHistory.filter.sqls
      sqls = sqls.concat(prevSqls)
    }
    const { cols, rows, metrics, filters, color, label, size, xAxis, tip, orders, cache, expired } = widgetProps
    let widgetConfigGroups = cols.concat(rows).filter((g) => g.name !== '指标名称').map((g) => g.name)

    if (color) {
      widgetConfigGroups = widgetConfigGroups.concat(color.items.map((c) => c.name))
    }
    if (label) {
      widgetConfigGroups = widgetConfigGroups.concat(label.items
        .filter((l) => l.type === 'category')
        .map((l) => l.name))
    }
    const currentDrillStatus = {
      filter: {
        out,
        enter,
        value,
        sql,
        sqls
      },
      groups: widgetConfigGroups,
      name: nextWidget.name,
      widgetConfig: widgetProps
    }
    this.setState({
      widgetProps
    })
    onGetChartData('rerender', itemId, Number(widget), {
      drillStatus: currentDrillStatus
    })
    onDrillPathData({
       sourceDataFilter: sourceDataOfBrushed,
       widget,
       itemId,
       widgetProps,
       out,
       enter,
       value,
       currentDrillStatus
    })
  }
  private drillData = (name, dimensions) => {
    const { onDrillData, widget, itemId } = this.props
    const { widgetProps, cacheWidgetProps } = this.state
    let mode = void 0
    if (widget && widget.config) {
      const cf = JSON.parse(widget.config)
      mode = cf.mode
    }
    if (onDrillData) {
      onDrillData({
        row: dimensions === 'row' ? name : [],
        col: dimensions === 'col' ? name : [],
        mode,
        itemId,
        widgetId: widget.id,
        groups: name,
        filters: this.state.whichDataDrillBrushed,
        sourceDataFilter: this.state.sourceDataOfBrushed
      })
    }
    this.setState({whichDataDrillBrushed: false})
    const isDrillUp = widgetProps.cols.some((col) => col.name === name) || widgetProps.rows.some((row) => row.name === name)
    if (isDrillUp) {
      const newCols = widgetProps.cols.filter((col) => col.name !== name)
      const newRows = widgetProps.rows.filter((row) => row.name !== name)
      this.setState({
        widgetProps: {
          ...widgetProps,
          ...{
            cols: newCols,
            rows: newRows
          }
        }
      })
    } else {
      if (dimensions && dimensions.length) { // pivot table
        switch (dimensions) {
          case 'row':
            this.setState({
              widgetProps: {
                ...widgetProps,
                ...{
                  rows: name && name.length
                  ? widgetProps.rows.concat({name})
                  : cacheWidgetProps.rows
                }
              }
            })
            break
          case 'col':
            this.setState({
              widgetProps: {
                ...widgetProps,
                cols: name && name.length
                ? widgetProps.cols.concat({name})
                : cacheWidgetProps.cols
              }
            })
            break
          default:
            return
        }
      } else if (widgetProps && widgetProps.dimetionAxis) {
        switch (widgetProps.dimetionAxis) {
          case 'col':
            this.setState({
                widgetProps: {
                  ...widgetProps,
                  ...{
                    cols: name && name.length
                    ? mode === 'pivot' ? widgetProps.cols.concat({name}) : [{name}]
                    : cacheWidgetProps.cols
                  }
                }
            })
            break
          case 'row':
            this.setState({
              widgetProps: {
                ...widgetProps,
                ...{
                  rows: name && name.length
                  ? mode === 'pivot' ? widgetProps.rows.concat({name}) : [{name}]
                  : cacheWidgetProps.rows
                }
              }
            })
            break
          default:
            break
        }
      } else if (widgetProps.selectedChart === ChartTypes.Table) {
        const cols = widgetProps.cols
        const { whichDataDrillBrushed } = this.state
        const drillData = whichDataDrillBrushed[0][0]
        const drillKey = drillData[drillData.length - 1]['key']
        const newWidgetPropCols = cols.reduce((array, col) => {
          array.push(col)
          if (col.name === drillKey) {
            array.push({name})
          }
          return array
        }, [])
        this.setState({
          widgetProps: {
            ...widgetProps,
            ...{
              cols: name && name.length
            //  ? widgetProps.cols.concat({name})
              ? newWidgetPropCols
              : cacheWidgetProps.cols
            }
          }
        })
      } else {
        this.setState({
          widgetProps: {
            ...widgetProps,
            ...{
              cols: name && name.length
              ? mode === 'pivot' ? widgetProps.cols.concat({name}) : [{name}]
              : cacheWidgetProps.cols
            }
          }
        })
      }
    }
  }

  private selectChartsItems = (selectedItems) => {
    const {onSelectChartsItems, itemId} = this.props
    if (onSelectChartsItems) {
      onSelectChartsItems(itemId, 'select', selectedItems)
    }
  }

  private getControlSelectOptions = (
    controlKey: string,
    userOptions: boolean,
    paramsOrOptions: { [viewId: string]: IDistinctValueReqeustParams } | any[]
  ) => {
    const { itemId, onGetControlOptions } = this.props
    onGetControlOptions(controlKey, userOptions, paramsOrOptions, itemId)
  }

  public render () {
    const {
      itemId,
      widget,
      datasource,
      loading,
      interacting,
      shareInfo,
      secretInfo,
      drillHistory,
      drillpathSetting,
      shareInfoLoading,
      downloadCsvLoading,
      renderType,
      controlSelectOptions,
      currentProject,
      onShowEdit,
      onShowDrillEdit,
      onSelectDrillHistory,
      onDeleteDashboardItem,
      onLoadWidgetShareLink,
      container
    } = this.props

    const data = datasource.resultList

    const {
      controlPanelVisible,
      sharePanelAuthorized,
      widgetProps,
      queryVariables,
      pagination,
      isDrilling,
      model
    } = this.state

    let downloadButton
    let shareButton
    let widgetButton
    let dropdownMenu

    if (currentProject) {
      const DownloadButton = ShareDownloadPermission<IDownloadCsvProps>(currentProject, 'download')(DownloadCsv)
      downloadButton = (
        <Tooltip title="下载数据">
          <DownloadButton
            id={widget.id}
            type="widget"
            itemId={itemId}
            shareInfo={shareInfo}
            shareInfoLoading={shareInfoLoading}
            downloadCsvLoading={downloadCsvLoading}
            onDownloadCsv={this.downloadCsv}
          />
        </Tooltip>
      )

      const ShareButton = ShareDownloadPermission<IconProps>(currentProject, 'download')(Icon)
      shareButton = (
        <Tooltip title="分享">
          <Popover
            placement="bottomRight"
            trigger="click"
            content={
              <SharePanel
                id={widget.id}
                type="widget"
                itemId={itemId}
                shareInfo={shareInfo}
                secretInfo={secretInfo}
                shareInfoLoading={shareInfoLoading}
                authorized={sharePanelAuthorized}
                onLoadWidgetShareLink={onLoadWidgetShareLink}
                afterAuthorization={this.changeSharePanelAuthorizeState(true)}
              />
            }
          >
            <ShareButton type="share-alt" onClick={this.changeSharePanelAuthorizeState(false)} />
          </Popover>
        </Tooltip>
      )

      widgetButton = (
        <Tooltip title="编辑widget">
          <i className="iconfont icon-edit-2" onClick={this.toWorkbench} />
        </Tooltip>
      )
    }

    if (container === 'share') {
      downloadButton = (
        <Tooltip title="下载数据">
          <DownloadCsv
            id={widget.id}
            type="widget"
            itemId={itemId}
            shareInfo={shareInfo}
            downloadCsvLoading={downloadCsvLoading}
            onDownloadCsv={this.downloadCsv}
          />
        </Tooltip>
      )
    } else {
      const InfoButton = ModulePermission<React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>>(currentProject, 'viz', false)(Span)
      const DeleteButton = ModulePermission<React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>>(currentProject, 'viz', true)(Span)
      const menu = (
        <Menu>
          <Menu.Item className={styles.menuItem}>
            <InfoButton className={styles.menuText} onClick={onShowEdit(itemId)}>基本信息</InfoButton>
          </Menu.Item>
          {/* <Menu.Item className={styles.menuItem}>
            <InfoButton className={styles.menuText} onClick={onShowDrillEdit(itemId)}>钻取设置</InfoButton>
          </Menu.Item> */}
          <Menu.Item className={styles.menuItem}>
            <Popconfirm
              title="确定删除？"
              placement="bottom"
              onConfirm={onDeleteDashboardItem(itemId)}
            >
              <DeleteButton className={styles.menuText}>删除</DeleteButton>
            </Popconfirm>
          </Menu.Item>
        </Menu>
      )
      dropdownMenu = (
        <Dropdown overlay={menu} placement="bottomRight" trigger={['click']}>
          <Icon type="ellipsis" />
        </Dropdown>
      )
    }

    const controls = widgetProps.controls
    const controlPanelHandle = controls.length
      ? (
        <Tooltip title="选择参数">
          <Icon
            className={styles.control}
            type={controlPanelVisible ? 'up-square-o' : 'down-square-o'}
            onClick={this.toggleControlPanel}
          />
        </Tooltip>
      ) : ''

    const descPanelHandle = widget.desc
      ? (
        <Popover placement="bottom" content={<p className={styles.descPanel}>{widget.desc}</p>}>
          <Icon className={styles.desc} type="question-circle-o" />
        </Popover>
      ) : ''

    const controlPanelTransitionName = {
      enter: styles.controlPanelEnter,
      enterActive: styles.controlPanelEnterActive,
      leave: styles.controlPanelLeave,
      leaveActive: styles.controlPanelLeaveActive
    }

    const drillButton = (
    <Tooltip title="钻取">
      <span style={{marginLeft: '8px', cursor: 'pointer', fontSize: '18px'}}  onClick={this.doDrill} className={`iconfont ${isDrilling ? 'icon-cube1' : 'icon-cube2'}`}/>
    </Tooltip>)

    const gridItemClass = classnames({
      [styles.gridItem]: true,
      [styles.interact]: interacting
    })
    let isSelectedData = false
    if (this.state.whichDataDrillBrushed) {
      (this.state.whichDataDrillBrushed as object[]).forEach((brushed, index) => {
        if (brushed[index] && (brushed[index] as any[]).length > 0) {
          isSelectedData = true
        }
      })
    }
    const categoriesCol = []
    Object.entries(model).forEach(([key, m]) => {
      if (m.modelType === 'category') {
        categoriesCol.push({
          name: key,
          type: 'category',
          visualType: m.visualType
        })
      }
    })

    const dataDrillPanelClass = classnames({
      [styles.dataDrillPanel]: true,
      [utilStyles.hide]: !isSelectedData
    })
    let positionStyle = {}
    if (this.state.dataDrillPanelPosition) {
      positionStyle = this.state.dataDrillPanelPosition
    }
    let mode = void 0
    let cf = void 0
    if (widget && widget.config) {
      cf = JSON.parse(widget.config)
      mode = cf.mode
    }
    const dataDrillPanel =
    (
      <div className={dataDrillPanelClass}>
        <DataDrill
          widgetConfig={cf}
          categoriesCol={categoriesCol}
          onDataDrillPath={this.drillpathData}
          onDataDrill={this.drillData}
          drillHistory={drillHistory}
          drillpathSetting={drillpathSetting}
          widgetMode={mode}
          currentData={data}
        />
      </div>
    )
    const dataDrillHistoryClass = classnames({
      [styles.dataDrillHistory]: true,
      [utilStyles.hide]: !(drillHistory && drillHistory.length > 0)
    })
    const dataDrillHistory =
    (
      <div className={dataDrillHistoryClass}>
        <DataDrillHistory
          itemId={itemId}
          widgetId={widget.id}
          drillHistory={drillHistory}
          onSelectDrillHistory={this.drillDataHistory}
        />
      </div>
    )

    const { selectedChart, cols, rows, metrics } = widgetProps
    const hasDataConfig = !!(cols.length || rows.length || metrics.length)
    const empty = (
      <DashboardItemMask.Empty
        loading={loading}
        chartType={selectedChart}
        empty={!data.length}
        hasDataConfig={hasDataConfig}
      />
    )

    return (
      <div className={gridItemClass} ref={(f) => this.container = f}>
        <div className={styles.header}>
          <div className={styles.title}>
            {controlPanelHandle}
            <h4>{widget.name}</h4>
            {loading && <Icon className={styles.control} type="loading" />}
            {descPanelHandle}
          </div>
          <div className={styles.tools}>
            <Tooltip title="同步数据">
              {!loading && <Icon type="reload" onClick={this.onSyncBizdatas} />}
            </Tooltip>
            {widgetButton}
            <Tooltip title="全屏">
              <Icon type="arrows-alt" onClick={this.onFullScreen} className={styles.fullScreen} />
            </Tooltip>
            {shareButton}
            {downloadButton}
            {dropdownMenu}
          </div>
        </div>

        <div
          className={styles.offInteract}
          onClick={this.turnOffInteract}
        >
          <i className="iconfont icon-unlink" />
          <h3>点击取消联动</h3>
        </div>
        <Animate
          showProp="show"
          transitionName={controlPanelTransitionName}
        >
          <DashboardItemControlPanel
            show={controlPanelVisible}
            onClose={this.toggleControlPanel}
          >
            <DashboardItemControlForm
              viewId={widget.viewId}
              controls={controls}
              mapOptions={controlSelectOptions}
              onGetOptions={this.getControlSelectOptions}
              onSearch={this.onControlSearch}
              onHide={this.toggleControlPanel}
            />
          </DashboardItemControlPanel>
        </Animate>
        <Dropdown overlay={dataDrillPanel} placement="topCenter" trigger={['contextMenu']}>
          <div className={styles.block}>
            <Widget
              {...widgetProps}
              renderType={loading ? 'loading' : renderType}
              data={data}
              interacting={this.props.interacting}
              queryVariables={queryVariables}
              pagination={pagination}
              empty={empty}
              model={model}
              onCheckTableInteract={this.checkTableInteract}
              onDoInteract={this.doInteract}
              onPaginationChange={this.paginationChange}
              getDataDrillDetail={this.getDataDrillDetail}
              isDrilling={this.state.isDrilling}
              whichDataDrillBrushed={this.state.whichDataDrillBrushed}
              onSelectChartsItems={this.selectChartsItems}
              selectedItems={this.props.selectedItems}
            //  onHideDrillPanel={this.onHideDrillPanel}
            />
            {dataDrillHistory}
          </div>
        </Dropdown>
      </div>
    )
  }
}

function Span (props: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>) {
  return (
    <span {...props} >{props.children}</span>
  )
}

export default DashboardItem
