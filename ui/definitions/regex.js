REGEX = {
	id: {
		regex: '^[\\w]{12}$',
		comment: '@(ID: Number of 12 characters)'
	},    
    uid: {
		regex: '^[\\w]{12}$',
		comment: '@(UID: Number of 12 characters)'
	},
    description: {
        regex: '^[A-Za-z\\s]{5,120}$',
        comment: '@(description: String of words, uppercase, lowercase, max 120 characters)'
    },
    name_2_10: {
		regex: '^[A-Za-z\\s]{5,120}$',
		comment: '@(name: String of 2 characters min and 10 characters max)'
	},
    icon: {
		regex: '^[a-z\\s]{5,120}$',
		comment: '@(icon: String of 2 characters min and 10 characters max)'
	},
	string_2_10: {
		regex: '^[\\w]{2,10}$',
		comment: '@(Word of 2 characters min and 10 characters max)'
	},
	string_3_10: {
		regex: '^[\\w]{3,10}$',
		comment: '@(Word of 3 characters min and 10 characters max)'
	},
	string_3_20: {
		regex: '^[\\w]{3,20}$',
		comment: '@(Word of 3 characters min and 20 characters max)'
	},
	string_5_10: {
		regex: '^[\\w]{5,10}$',
		comment: '@(Word of 5 characters min and 10 characters max)'
	},
	string_5_20: {
		regex: '^[\\w]{5,20}$',
		comment: '@(Word of 5 characters min and 20 characters max)'
	},
	string_5_60: {
		regex: '^[\\w]{5,60}$',
		comment: '@(Word of 5 characters min and 60 characters max)'
	}
};

REGEX_USERS = {
    name: {
        regex: '^[A-Za-z-\\s]{3,50}$',
        comment: '@(name: String of 3 characters min and 50 characters max)'
    },
	email: {
		regex: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
		comment: '@(email: Invalid email)'
	},
	password: {
		regex: '^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}.*$',
		comment: '@(password: Minimum eight characters, at least one letter and one number)'
	},
	language: {
		regex: '^(en|fr|es|sk)$',
		comment: '@(language: Invalid language)'
	},
	token: {
		regex: '^[\\w_]{64}$',
		comment: '@(token: Invalid token)'
	},
    permissions: {
		regex: '^\\[("[^"]*",?\\s*)*\\]$',
		comment: '@(permissions: Invalid value)'
	}
};

REGEX_CATALOGS = {
    name: {
        regex: '^[a-zA-Z_0-9]{3,50}$',
        comment: '@(name: String of 3 characters min and 50 characters max)'
    },
    alias: {
        regex: '^[\\w\\s]{3,30}$',
        comment: '@(alias: String of 3 characters min and 30 characters max)'
    },
    description: {
		regex: '^[\\w\\s,]{5,200}$',
        comment: '@(description: String of words, uppercase, lowercase, max 200 characters)'
    },
    documentation: {
        regex: '^(http|https):\\/\\/[\\w\\-]+(\\.[\\w\\-]+)+([\\w\\-\\.,@?^=%&:/~\\+#]*[\\w\\-\\@?^=%&/~\\+#])?$',
        comment: '@(documentation: String of words, uppercase, lowercase, max 120 characters)'
    },
    picto: {
        regex: '^[\\w-]{3,30}$',
        comment: '@(picto: String of 3 characters min and 30 characters max)'
    },
    version: {
        regex: '^\\d+\\.\\d+\\.\\d+$',
        comment: '@(version: Invalid)'
    },
	crontab: {
		regex: '^(0|[1-5]?[0-9]|[*]) (0?[1-9]|1[0-9]|2[0-3]|[*]) (0?[1-9]|[12][0-9]|3[01]|[*]) (0?[1-9]|1[0-2]|[*]) (0?[0-6]|[*])$',
		comment: '@(crontab: invalid)'
	},
};

REGEX_PROJECTS = {
	name: {
		regex: '^[a-zA-Z-]{3,100}$',
		comment: '@(name: String of 5 characters min and 20 characters max)'
	},
    description: {
		regex: '^[A-Za-z\\s]{5,120}$',
        comment: '@(description: String of words, uppercase, lowercase, max 120 characters)'
    },
	admin_ip: {
		regex: '^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(?<!172\\.(16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31))(?<!127)(?<!^10)(?<!^0)\\.([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(?<!192\\.168)(?<!172\\.(16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31))\\.([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\\.([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$',
		comment: '@(admin ip: Public IPV4 address only)'
	},
	admin_login: {
		regex: '^[a-zA-Z]{3,20}$',
		comment: '@(admin login: String of 3 characters min and 20 characters max)'
	},
	admin_pass: {
		regex: '^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}.*$',
		comment: '@(password: Minimum eight characters, at least one letter and one number)'
	}
}

REGEX_SOFTWARES = {
    size: {
		regex: '^(tiny|small|medium|large|xxl)$',
		comment: '@(size: Invalid value)'
	},
    domain: {
		regex: '^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$',
		comment: '@(domain: Invalid value)'
	},
    domain_alias: {
		regex: '^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$',
		comment: '@(domain alias: Invalid value)'
	},
    exposition: {
		regex: '^(none|public|public-unmanaged|private)$',
		comment: '@(domain type: Invalid value)'
	}
}

FUNC.regex_noUnicode = function(regex, value){
	const r = new RegExp(regex.regex);
	return r.test(value);
}

FUNC.regex = function(regex, value){
	const r = new RegExp(regex.regex, 'u');
	return r.test(value);
}

FUNC.regex_array = function(value){
	if(value == undefined || value.constructor !== Array){
		return false;
	}
	return true;
}

FUNC.regex_array2 = function(value){
    if (!Array.isArray(value)) {
		return false;
    }
	return true;
}

FUNC.regex_locations = function(value) {
    if (!Array.isArray(value)) {
		return false;
    }
    var match =  value.every(location => location === 'frontends' || location === 'backends');
    if (!match) {
		return false;
    }
	return true;
}