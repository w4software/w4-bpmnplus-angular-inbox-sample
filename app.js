'use strict';

angular.module('angular-inbox', [ 'ngRoute' ])

.config(function($routeProvider)
{
  $routeProvider.when('/login',
  {
    templateUrl: 'login.html',
    controller: 'LoginCtrl'
  });
  $routeProvider.when('/inbox',
  {
    templateUrl: 'inbox.html',
    controller: 'InboxCtrl',
    resolve:
    {
      inbox: function(W4Service) { return W4Service.getInbox(); }
    }
  });
  $routeProvider.otherwise(
  {
    redirectTo: function(params, path, search)
    {
        return "/login";
    }
  });
})

.factory('W4Service', function($http)
{
  function W4Service()
  {
    this.server = 'localhost:7705';
  }

  W4Service.prototype.setServer = function(server)
  {
    this.server = server;
  }

  W4Service.prototype.api = function(method, url, data)
  {
    var buildParam = function(data)
    {
      var parameters = {};
      angular.forEach(data, function(value, key)
      {
        if (angular.isObject(value) || angular.isArray(value))
        {
          angular.forEach(buildParam(value), function(subValue, subKey)
          {
            parameters[key + "." + subKey] = subValue;
          });
        }
        else
        {
          parameters[key] = value;
        }
      });
      return parameters;
    }

    var request =
    {
      method: method,
      url: 'http://' + this.server + '/' + url,
      headers:
      {
        'Content-Type': undefined
      },
    };
    if (method == 'POST' || method == 'PUT')
    {
      var formData = [];
      angular.forEach(buildParam(data), function(v,k) { formData.push(k + "=" + v); });
      request.data = formData.join('&');
    }
    else
    {
      request.params = buildParam(data);
    }
    return $http(request);
  }
  
  W4Service.prototype.login = function(authenticationName, password)
  {
    var self = this;
    return self.api('POST', 'login',
    {
      'authenticationName': authenticationName,
      'password': password,
      'propagate': false,
    })
      .success(function(data)
      {
        self.principal =
        {
          id: data.principals[0].id,
          name: data.principals[0].name,
          userIdentifier: data.principals[0].userIdentifier,
        };
        self.userName = data.name;
      });
  }

  W4Service.prototype.getInbox = function()
  {
    var self = this;

    var userFilter = 
    {
      'class': 'UserFilter',
      'userNamePattern': self.userName,
    };

    var effectiveSubstituteFilter =
    {
      'class': 'UserFilter',
      'userFilterType': 'EFFECTIVE_SUBSTITUTE',
      'andFilters': [ userFilter ],
    };

    var groupFilter =
    {
      'class': 'GroupFilter',
      'andFilters': [ userFilter ],
    };

    var potentialOwnerFilter =
    {
      'class': 'PotentialOwnerFilter',
      'orFilters': [[ userFilter, groupFilter]],
    };

    var excludedOwnerFilter =
    {
      'class': 'ExcludedOwnerFilter',
      'orFilters': [[ userFilter, groupFilter]],
    };

    var actualOwnerFilter =
    {
      'class': 'ActualOwnerFilter',
      'andFilters': [ userFilter ],
    };

    var effectiveSubstituteOfActualOwnerFilter =
    {
      'class': 'ActualOwnerFilter',
      'userIsPresent': 'false',
      'andFilters': [ effectiveSubstituteFilter ],
    };

    var effectivePotentialOwnerFilter =
    {
      'class': 'UserTaskInstanceFilter',
      'andFilters': [ potentialOwnerFilter ],
      'notFilters': [ excludedOwnerFilter ],
    };

    return self.api('GET', 'activityInstances', 
    {
      'principal': self.principal,
      'filter':
      {
        'class': 'UserTaskInstanceFilter',
        'activityInstanceState': 'ACTIVE',
        'orFilters':
        [
          [
            actualOwnerFilter,
            effectiveSubstituteOfActualOwnerFilter,
            effectivePotentialOwnerFilter,
          ],
        ],
      },
      'attachment':
      {
        'class': 'UserTaskInstanceAttachment',
        'activityDescriptorAttached': 'true',
        'actualOwnerAttached': 'false',
        'businessAdministratorsAttached': 'false',
        'excludedOwnersAttached': 'false',
        'potentialAndNotExcludedOwnersAttached': 'false',
        'potentialOwnersAttached': 'false',
        'processInstanceAttached': 'true',
        'dataEntriesAttached': 'false',
        'stakeholdersAttached': 'false',
        'processInstanceAttachment':
        {
        	'activityInstancesAttached': 'false',
        	'businessAdministratorsAttached': 'false',
        	'conversationNodeInstanceIdentifiersAttached': 'false',
        	'dataEntriesAttached': 'false',
        	'eventInstancesAttached': 'false',
        	'gatewayInstancesAttached': 'false',
        	'initiatorAttached': 'true',
        	'potentialInitiatorsAttached': 'false',
        	'processDescriptorAttached': 'true',
        	'stakeholdersAttached': 'false',
        }
      },
    });
  }

  return new W4Service();
})

.controller('LoginCtrl', function($scope, $http, $location, W4Service)
{
  $scope.server = W4Service.server;
  $scope.doLogin = function()
  {
    W4Service.server = $scope.server;
    W4Service.login($scope.login, $scope.password)
      .success(function() { $location.path('inbox'); });
  }
})

.controller('InboxCtrl', function($scope, inbox)
{
  $scope.tasks = inbox.data;
});