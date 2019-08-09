Cypress.Commands.add('login', (options) => {
    cy.request({
        method: 'POST',
        url: '/', // baseUrl is prepended to url
        form: true, // indicates the body should be form urlencoded and sets Content-Type: application/x-www-form-urlencoded headers
        body: {
            'username': options['username'],
            'password': options['password'],
            'submitted': 1,
            'redcap_login_a38us_09i85':'redcap_login_a38us_09i85'
        }
    }).should(($a) => {
        expect($a.status).to.equal(200)
    })
})

Cypress.Commands.add('visit_version', (options) => {

    let version = Cypress.env('redcap_version')

    cy.maintain_login().then(() => {
        if('params' in options){
            cy.visit('/redcap_v' + version + '/' + options['page'] +  '?' + options['params'])
        } else {
            cy.visit('/redcap_v' + version + '/' + options['page'])
        }
    })
})

Cypress.Commands.add('visit_base', (options) => {
    cy.maintain_login().then(() => {
        if ('url' in options) cy.visit(options['url']) 
    })
})

Cypress.Commands.add('maintain_login', () => {
    let user = window.user_info.get_current_user()
    let pass = window.user_info.get_current_pass()

    let user_type = window.user_info.get_user_type()
    let previous_user_type = window.user_info.get_previous_user_type()

    if(user_type === previous_user_type){        
        cy.getCookies()
          .should((cookies) => {

            //In most cases, we'll have cookies to preserve to maintain a login
            if (cookies.length > 0){

                console.log('Cookie Login')

                cookies.map(cookie =>  Cypress.Cookies.preserveOnce(cookie['name']) )

            //But, if we don't, then let's simply re-login, right?    
            } else {     

                console.log('Regular Login')

                cy.login({ username: user, password: pass })
            }         
            
        })  

    //If user type has changed, let's clear cookies and login again
    } else {
        console.log('User Type Change')

        cy.clearCookies()
        cy.login({ username: user, password:  pass })
    }

    window.user_info.set_previous_user_type()
})

Cypress.Commands.add('set_user_type', (user_type) => {
    window.user_info.set_user_type(user_type)
})

Cypress.Commands.add('set_user_info', (users) => {
    window.user_info.set_users(users)
})

Cypress.Commands.add('mysql_db', (type, replace = '') => {
    const mysql = Cypress.env("mysql")

    const cmd = 'sh test_db/db.sh' +
        ' ' + mysql['path'] +
        ' ' + mysql['host'] +
        ' ' + mysql['port'] +
        ' ' + mysql['db_name'] +
        ' ' + mysql['db_user'] +
        ' ' + mysql['db_pass'] +
        ' ' + type +
        ' ' + replace

        console.log(cmd)

    cy.exec(cmd).then((response) => {
        //cy.writeFile('log_of_mysql_command' + type + '.txt', response)
        console.log(response)
    })
})

function test_link (link, title, try_again = true) {
    cy.get('div#control_center_menu a').
        contains(link).
        click().
        then(($control_center) => {
            if($control_center.find('div#control_center_window').length){
                cy.get('div#control_center_window').then(($a) => {
                    if($a.find('div#control_center_window h4').length){ 
                        cy.get('div#control_center_window h4').contains(title)
                    } else if ($a.find('div#control_center_window div').length){
                        cy.get('div#control_center_window div').contains(title)
                    } else {
                        cy.get('body').contains(title)
                    }                
                })
            } else {
                cy.get('body').contains(title)
            }
        }) 
}

Cypress.Commands.add('contains_cc_link', (link, title = '') => {
    if(title == '') title = link
    let t = Cypress.$("div#control_center_menu a:contains(" + JSON.stringify(link) + ")");
    t.length ? test_link(link, title) : test_link(link.split(' ')[0], title.split(' ')[0])
})

Cypress.Commands.add('find_online_designer_field', (name, timeout = 10000) => {
     cy.contains('td', name, { timeout: timeout })
})

Cypress.Commands.add('compare_value_by_field_label', (name, value, timeout = 10000) => {
    cy.contains('td', name, { timeout: timeout }).parent().parentsUntil('tr').last().parent().then(($tr) => {
        const name = $tr[0]['attributes']['sq_id']['value']
        cy.get('[name="' + name + '"]', { force: true }).should(($a) => {
            expect($a[0]['value']).to.equal(value)
        })
    })
})

Cypress.Commands.add('select_field_by_label', (name, timeout = 10000) => {
    cy.contains('td', name, { timeout: timeout }).parent().parentsUntil('tr').last().parent().then(($tr) => {
        const name = $tr[0]['attributes']['sq_id']['value']
        cy.get('[name="' + name + '"]', { force: true }).then(($a) => {
            return $a[0]
        })
    })
})

Cypress.Commands.add('initial_save_field', () => {
    cy.get('input#field_name').then(($f) => {
        cy.contains('button', 'Save').
           should('be.visible').
           click().
           then(() => {

                cy.contains('Alert').then(($a) => {
                    if($a.length){
                        cy.get('button[title=Close]:last:visible').click()
                        cy.get('input#auto_variable_naming').click()
                        cy.contains('button', 'Enable auto naming').click().then(() => {
                            cy.contains('button', 'Save').click()
                        })       
                    }                        
                })
            })                
    })   
})

Cypress.Commands.add('save_field', () => {
    cy.get('input#field_name').then(($f) => {
        cy.contains('button', 'Save').click()
    }) 
   
})

Cypress.Commands.add('add_field', (field_name, type) => {
     cy.get('input#btn-last').click().then(() => {
        cy.get('textarea#field_label').clear().type(field_name).then(() => {
            cy.get('select#val_type').select(type).should('have.value', type).then(() => {
                cy.save_field()
                cy.find_online_designer_field(field_name)  
            })            
        })
    })
})

function error(){
    console.log('error');
}

Cypress.Commands.add('require_redcap_stats', () => {
    cy.server()
    cy.route({method: 'POST', url: '**/ProjectGeneral/project_stats_ajax.php'}).as('project_stats_ajax')
    cy.wait('@project_stats_ajax').then((xhr, error) => { })
})

function abstractSort(col_name, element, values, klass = 0){
    const sortCompare1 = sorterCompare(col_name, element, values[0], klass)
    const sortCompare2 = sorterCompare(col_name, element, values[1], klass)
    sortCompare1.then(() => { sortCompare2 })
}

function sorterCompare(col_name, element, values, klass){
    return cy.get('table#table-proj_table tr span').should('not.contain', "Loading").then(() => {
        cy.get('th div').contains(col_name).click().then(()=>{
            cy.get(element).then(($e) => {
                cy.get('table#table-proj_table tr span').should('not.contain', "Loading").then(() => {
                    klass ? expect($e).to.have.class(values) : expect($e).to.contain(values)       
                })                                
            })
        })
    })
}

Cypress.Commands.add('check_column_sort_values', (col_name, element, values) => {
    abstractSort(col_name, element, values)
})

Cypress.Commands.add('check_column_sort_classes', (col_name, values) => {
    abstractSort(col_name, 'table#table-proj_table tr:first span', values, 1)
})

function abstractProjectView(input, project_name, total_projects, dropdown_click){
    cy.get('input#user_search').clear()

    cy.get('input#user_search').type(input).then(() => {   

        let $t = dropdown_click ? cy.get('button#user_search_btn') : cy.get('ul#ui-id-1 li a')

        $t.click().then(($a) => {
            cy.get('table#table-proj_table tr span').should('not.contain', "Loading").then(() => {
                 cy.get('table#table-proj_table tr:first div.projtitle').then(($a) => {
                    expect($a).to.contain(project_name)
                    cy.get('table#table-proj_table').find('tr:visible').should('have.length', total_projects)
                })
            })
        })
    })
}

Cypress.Commands.add('visible_projects_user_input_click_view', (input, project_name, total_projects) => {
    abstractProjectView(input, project_name, total_projects, true)
})

Cypress.Commands.add('visible_projects_user_input', (input, project_name, total_projects) => {
    abstractProjectView(input, project_name, total_projects, false)
})





//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })
